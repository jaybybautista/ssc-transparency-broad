import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { isFirebaseEnabled, storage } from './firebase';
import { notifyOutsideReact } from './notifier';

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const compressAndResizeImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });

let lastUploadFailureReason = '';

const formatMb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

/**
 * Turns a Firebase Storage error into an explanation an admin can act on.
 * A missing bucket is by far the most common cause and previously surfaced as a
 * confusing CORS message.
 */
const describeStorageFailure = (error, file) => {
  const code = error?.code || '';
  const message = String(error?.message || error || '');

  if (code === 'storage/unauthorized') {
    return 'Firebase Storage rejected the upload (storage rules denied it). Deploy storage.rules — see STORAGE.md.';
  }
  if (code === 'storage/retry-limit-exceeded' || message.includes('Upload timeout')) {
    return `The upload timed out. ${formatMb(file.size)} may be too slow on this connection — try again on a faster network.`;
  }
  if (
    code === 'storage/unknown' ||
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    message.includes('CORS') ||
    message.includes('Failed to fetch') ||
    message.includes('ERR_FAILED')
  ) {
    return (
      'Firebase Storage is not set up for this project, so large files cannot be stored. ' +
      'Enable Storage in the Firebase console (see STORAGE.md), then try again.'
    );
  }
  return message || 'The upload failed for an unknown reason.';
};

const uploadAnyFiles = async (files, folder, onProgress) => {
  if (!files?.length) {
    return [];
  }

  const MAX_FILE_SIZE_MB = 25;

  /**
   * Cap for the offline/no-Storage fallback, which embeds the file as a base64
   * data URL inside the Firestore document.
   *
   * Firestore's hard limit is 1 MiB *per document*, and base64 inflates a file
   * by roughly 33%, so ~700KB of real file is the ceiling — and that still has
   * to share the document with every other field. Raising this number does not
   * buy bigger uploads; it just trades a clear error for an opaque
   * "document too large" failure from Firestore.
   *
   * Anything bigger needs Firebase Storage (see SECURITY.md / STORAGE.md).
   */
  const FALLBACK_MAX_SIZE_KB = 700;

  // Big files over campus wifi need far longer than a flat 10s. Scale with size
  // and keep a generous floor.
  const timeoutForFile = (file) => Math.max(45000, Math.ceil(file.size / (1024 * 1024)) * 20000);

  const withTimeout = (promise, timeoutMs) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), timeoutMs))
    ]);

  const fileList = Array.from(files);
  const uploadedUrls = [];
  let failedCount = 0;
  let lastFailure = '';

  for (let index = 0; index < fileList.length; index += 1) {
    let file = fileList[index];
    if (file.type.startsWith('image/')) {
      try {
        file = await compressAndResizeImage(file);
      } catch (e) {
        // use original file if compression fails
      }
    }

    onProgress?.({
      current: index + 1,
      total: fileList.length,
      status: 'uploading',
      fileName: file.name,
      successCount: uploadedUrls.length,
      failedCount
    });

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      failedCount += 1;
      onProgress?.({
        current: index + 1,
        total: fileList.length,
        status: 'skipped',
        fileName: file.name,
        successCount: uploadedUrls.length,
        failedCount
      });
      continue;
    }

    if (!isFirebaseEnabled || !storage) {
      // Offline / Local fallback to base64 data URL if size is small enough
      if (file.size > FALLBACK_MAX_SIZE_KB * 1024) {
        failedCount += 1;
        lastFailure =
          `“${file.name}” is ${formatMb(file.size)}. Without Firebase Storage, files are embedded in the ` +
          `database and cannot exceed ${FALLBACK_MAX_SIZE_KB}KB. Enable Storage to upload files this large — see STORAGE.md.`;
        onProgress?.({
          current: index + 1,
          total: fileList.length,
          status: 'failed',
          fileName: file.name,
          reason: lastFailure,
          successCount: uploadedUrls.length,
          failedCount
        });
        continue;
      }
      try {
        const base64Url = await fileToBase64(file);
        uploadedUrls.push(base64Url);
        onProgress?.({
          current: index + 1,
          total: fileList.length,
          status: 'uploaded',
          fileName: file.name,
          successCount: uploadedUrls.length,
          failedCount
        });
      } catch (err) {
        failedCount += 1;
        onProgress?.({
          current: index + 1,
          total: fileList.length,
          status: 'failed',
          fileName: file.name,
          successCount: uploadedUrls.length,
          failedCount
        });
      }
      continue;
    }

    try {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const storageRef = ref(storage, `${folder}/${uniqueName}`);
      await withTimeout(uploadBytes(storageRef, file), timeoutForFile(file));
      const url = await getDownloadURL(storageRef);
      uploadedUrls.push(url);
      onProgress?.({
        current: index + 1,
        total: fileList.length,
        status: 'uploaded',
        fileName: file.name,
        successCount: uploadedUrls.length,
        failedCount
      });
    } catch (error) {
      // If Firebase upload fails, try falling back to base64 if small enough
      if (file.size <= FALLBACK_MAX_SIZE_KB * 1024) {
        try {
          const base64Url = await fileToBase64(file);
          uploadedUrls.push(base64Url);
          onProgress?.({
            current: index + 1,
            total: fileList.length,
            status: 'uploaded',
            fileName: file.name,
            successCount: uploadedUrls.length,
            failedCount
          });
          continue;
        } catch (fallbackError) {
          // fall through to error handling
        }
      }

      failedCount += 1;
      lastFailure = describeStorageFailure(error, file);
      onProgress?.({
        current: index + 1,
        total: fileList.length,
        status: 'failed',
        fileName: file.name,
        reason: lastFailure,
        successCount: uploadedUrls.length,
        failedCount
      });
    }
  }

  onProgress?.({
    current: fileList.length,
    total: fileList.length,
    status: 'done',
    reason: lastFailure,
    successCount: uploadedUrls.length,
    failedCount
  });

  if (!uploadedUrls.length && lastFailure) {
    lastUploadFailureReason = lastFailure;
  } else if (uploadedUrls.length) {
    lastUploadFailureReason = '';
  }

  return uploadedUrls;
};

/**
 * Human-readable reason for the most recent failed upload, so forms can explain
 * what actually went wrong instead of guessing about file size.
 */
export const getLastUploadFailureReason = () => lastUploadFailureReason;

export const uploadImages = async (files, folder, onProgress) => uploadAnyFiles(files, folder, onProgress);
export const uploadFiles = async (files, folder, onProgress) => uploadAnyFiles(files, folder, onProgress);

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * True for a URL that points at an object in this project's Storage bucket —
 * the only kind of upload we are able to delete.
 *
 * Deliberately narrow. The other two kinds of URL a post can hold:
 *  - `data:` — the base64 fallback. It lives *inside* the Firestore document, so
 *    deleting the document already removes it. Nothing to do.
 *  - a Google Drive link — someone else's file in someone's Drive. Removing it
 *    needs Drive credentials this app does not have and should not have, so it
 *    is left alone rather than failing noisily.
 */
const isStorageUrl = (url) =>
  typeof url === 'string' && /^https?:\/\/firebasestorage\.googleapis\.com\//i.test(url);

/**
 * Collects every file URL a record references, across the field names the
 * different content types use.
 */
export const collectFileUrls = (record) => {
  if (!record) return [];
  const candidates = [
    ...(Array.isArray(record.imageUrls) ? record.imageUrls : []),
    record.imageUrl,
    record.image,
    record.fileUrl,
    record.pdfUrl,
    record.templateUrl,
    record.authorImage
  ];
  return [...new Set(candidates.filter(Boolean))];
};

/**
 * Deletes the Storage objects a record referenced, after that record is gone.
 *
 * Failures are swallowed on purpose. This runs *after* the Firestore delete has
 * already succeeded, so the user's action is complete either way — and the most
 * common failure is `storage/object-not-found`, which means a previous cleanup
 * already handled it. Turning that into an error message would report a problem
 * where none exists.
 *
 * @returns {Promise<{deleted: number, skipped: number, failed: number}>}
 */
export const deleteRecordFiles = async (record) => {
  const urls = collectFileUrls(record);
  const summary = { deleted: 0, skipped: 0, failed: 0 };

  if (!isFirebaseEnabled || !storage || !urls.length) {
    summary.skipped = urls.length;
    return summary;
  }

  await Promise.all(
    urls.map(async (url) => {
      if (!isStorageUrl(url)) {
        summary.skipped += 1;
        return;
      }
      try {
        // ref() accepts a full download URL and resolves it to the object path.
        await deleteObject(ref(storage, url));
        summary.deleted += 1;
      } catch (error) {
        if (error?.code === 'storage/object-not-found') {
          summary.skipped += 1;
        } else {
          summary.failed += 1;
          console.warn('Could not delete stored file:', url, error?.code || error);
        }
      }
    })
  );

  return summary;
};

export const downloadDocument = (url, fileName = 'document') => {
  if (!url) {
    notifyOutsideReact('No document file is attached yet.');
    return;
  }

  if (url.startsWith('data:')) {
    try {
      const parts = url.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    } catch (e) {
      console.error('Blob conversion failed, using direct anchor fallback', e);
    }
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
