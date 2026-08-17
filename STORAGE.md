# Enabling file uploads (large documents)

## The problem

Firebase Storage has **never been provisioned** for the `ssc-virtual-board`
project. All three possible bucket names return `404 Not Found`:

```
ssc-virtual-board.firebasestorage.app   → 404
ssc-virtual-board.appspot.com           → 404
ssc-virtual-board                       → 404
```

Because the bucket doesn't exist, every upload in the app has been silently
falling back to embedding the file as a base64 data URL **inside the Firestore
document**. That path has a hard ceiling:

- Firestore allows **1 MiB per document**
- base64 encoding inflates a file by about **33%**
- so roughly **700 KB of real file** is the maximum, and it shares that budget
  with every other field on the record

**A 2 MB PDF cannot fit that path at any setting.** Raising the limit in code
would only swap a clear error for an opaque Firestore "document too large"
failure.

The browser reported this as a CORS error, which was misleading — a 404 on the
preflight request surfaces as a CORS failure.

---

## The fix: turn on Storage (about a minute)

1. Open the [Firebase console](https://console.firebase.google.com/project/ssc-virtual-board/storage)
2. Go to **Build → Storage**
3. Click **Get started**
4. When asked about rules, pick **Start in production mode** — the repo has
   proper rules to deploy in the next step
5. **Choose a US region** (e.g. `us-central1`) — see the note below

> **Location is permanent.** It cannot be changed after the bucket is created.

### Why a US region

This project uses a modern `*.firebasestorage.app` bucket. Per Firebase's
[pricing page](https://firebase.google.com/pricing), the no-cost tier for those
buckets (5 GB-months stored, 100 GB/month downloaded) applies to **US regions
only**.

Picking a nearer region such as `asia-southeast1` may fall outside the free
allowance. The latency cost of a US region is a few hundred milliseconds on a
document download — irrelevant for occasional PDF viewing, and not worth paying
for. The Firebase console marks which locations are free-tier eligible when you
choose; go by what it shows you at the time.

Then deploy the storage rules:

```bash
npx firebase-tools deploy --only storage
```

### Check the bucket name matches

After creating it, the console shows the bucket name at the top of the Storage
page (`gs://…`). It must match `REACT_APP_FIREBASE_STORAGE_BUCKET` in `.env`,
without the `gs://` prefix. If they differ, update `.env` and restart the dev
server.

---

## After enabling

| | Before | After |
|---|---|---|
| Max upload | ~700 KB | **25 MB** |
| Where files live | Inside Firestore documents | Firebase Storage |
| Your 2 MB constitution | Fails | Works |

The 25 MB ceiling is set in two places that should stay in sync:

- `MAX_FILE_SIZE_MB` in `src/lib/uploads.js`
- the size check in `storage.rules`

Storage itself allows up to 5 TB per file, so raise both if you ever need more.

Upload timeouts now scale with file size (45 s minimum, +20 s per MB) instead of
a flat 10 s, which was too short for multi-megabyte files on campus wifi.

---

## Cost — Storage requires the Blaze plan on this project

The Firebase console for `ssc-virtual-board` says: *"To use Storage, upgrade your
project's pricing plan."* Newer projects require **Blaze** (pay-as-you-go) to
create a bucket at all, even though the free allowance below still applies once
you have one. Blaze needs a credit or debit card on file.

**If you do not want to attach a card, skip to
[Option B: Google Drive links](#option-b-google-drive-links-no-card-needed)** —
it works today and previews inline.

| Plan | Storage | Downloads | Operations |
|---|---|---|---|
| **Spark** (`*.firebasestorage.app`, US region) | 5 GB-months free | 100 GB/month free | — |
| **Spark** (legacy `*.appspot.com`) | 5 GB free | 1 GB/day free | 20K uploads/day, 50K reads/day |
| **Blaze** beyond free tier | ~$0.026/GB | ~$0.12/GB | — |

For scale: a 2 MB constitution is **0.04%** of the 5 GB allowance. You could
store roughly 2,500 documents that size and still be inside the free tier.

If you do end up on Blaze for any reason, the same free allowance still applies
first — you only pay past it, which at this scale is ₱0. Set a budget alert in
the Google Cloud console if you want a hard guardrail.

### Another reason to move off the current setup

Right now files are embedded in Firestore documents, which consumes the
**Firestore** quota instead — and that free tier is much tighter: **1 GiB total**,
20K writes/day, 50K reads/day. Storing documents there burns a scarce resource
and makes every page load download the file contents. Moving to Storage frees
that up.

---

## Option B: Google Drive links (no card needed)

The document viewer now understands Google Drive links and converts them to
Drive's embeddable `/preview` form, so **a Drive-hosted PDF reads inline on the
site exactly like an uploaded one**.

1. Upload the file to Google Drive
2. Share → **Anyone with the link** → **Viewer**
3. Copy the link and paste it into the **"Or paste a link"** field on any form

All of these link shapes work:

```
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
https://drive.google.com/open?id=FILE_ID
https://drive.google.com/uc?id=FILE_ID&export=download
https://docs.google.com/document/d/FILE_ID/edit
```

| | Blaze + Storage | Drive links |
|---|---|---|
| Cost | Card required, ~₱0 in practice | Free, no card |
| Max size | 25 MB | 15 GB (Drive's own quota) |
| Inline preview | Yes | Yes |
| Download button | Yes | Via Drive's own control in the frame |
| Depends on | Your Firebase project | The Drive file staying shared |

The main caveat: if someone later unshares or deletes the Drive file, or the
account owning it is deprovisioned, the document breaks on the site. A file in
your own Storage bucket does not have that dependency — worth considering for
something as permanent as the constitution.
