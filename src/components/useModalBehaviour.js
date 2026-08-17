import { useEffect } from 'react';

/**
 * Shared modal behaviour: close on Escape and stop the page behind the modal
 * from scrolling while it is open.
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 */
const useModalBehaviour = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);
};

export default useModalBehaviour;
