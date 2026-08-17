import React, { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiX, FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';
import './ImageCarousel.css';

/**
 * Image carousel with a full-screen zoomable lightbox.
 * Tapping any slide opens the lightbox; tapping the photo there toggles zoom.
 */
const ImageCarousel = ({ images = [], alt = 'Image', className = '' }) => {
  // De-duplicated so records saved before image de-duplication existed
  // don't show the same photo twice.
  const photos = [...new Set((images || []).filter(Boolean))];
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const total = photos.length;

  const goTo = useCallback(
    (next) => {
      if (!total) return;
      setIndex(((next % total) + total) % total);
      setZoomed(false);
    },
    [total]
  );

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoomed(false);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goTo(index + 1);
      if (e.key === 'ArrowLeft') goTo(index - 1);
    };

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, index, goTo, closeLightbox]);

  if (!total) return null;

  const handleZoomMove = (e) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };

  return (
    <>
      <div className={`carousel ${className}`.trim()}>
        <div className="carousel-stage">
          <img
            src={photos[index]}
            alt={`${alt} ${index + 1} of ${total}`}
            className="carousel-image"
            onClick={() => setLightboxOpen(true)}
          />

          <button
            type="button"
            className="carousel-expand"
            title="View full screen"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <FiMaximize2 />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                className="carousel-nav prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index - 1);
                }}
              >
                <FiChevronLeft />
              </button>
              <button
                type="button"
                className="carousel-nav next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index + 1);
                }}
              >
                <FiChevronRight />
              </button>
              <span className="carousel-counter">
                {index + 1} / {total}
              </span>
            </>
          )}
        </div>

        {total > 1 && (
          <div className="carousel-thumbs">
            {photos.map((photo, photoIndex) => (
              <button
                type="button"
                key={`${photo}-${photoIndex}`}
                className={`carousel-thumb ${photoIndex === index ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(photoIndex);
                }}
                aria-label={`Show image ${photoIndex + 1}`}
              >
                <img src={photo} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-counter">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              className="lightbox-btn"
              title={zoomed ? 'Zoom out' : 'Zoom in'}
              onClick={() => setZoomed((prev) => !prev)}
            >
              {zoomed ? <FiZoomOut /> : <FiZoomIn />}
            </button>
            <button type="button" className="lightbox-btn" title="Close" onClick={closeLightbox}>
              <FiX />
            </button>
          </div>

          <div
            className={`lightbox-stage ${zoomed ? 'zoomed' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={handleZoomMove}
          >
            <img
              src={photos[index]}
              alt={`${alt} ${index + 1} of ${total}`}
              className="lightbox-image"
              style={zoomed ? { transformOrigin: `${origin.x}% ${origin.y}%` } : undefined}
              onClick={() => setZoomed((prev) => !prev)}
            />
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index - 1);
                }}
              >
                <FiChevronLeft />
              </button>
              <button
                type="button"
                className="lightbox-nav next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index + 1);
                }}
              >
                <FiChevronRight />
              </button>
            </>
          )}

          <p className="lightbox-hint" onClick={(e) => e.stopPropagation()}>
            Click the photo to {zoomed ? 'zoom out' : 'zoom in'} · Esc to close
          </p>
        </div>
      )}
    </>
  );
};

export default ImageCarousel;
