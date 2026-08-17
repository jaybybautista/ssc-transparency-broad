import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(',');

/**
 * Shared modal behaviour: close on Escape, stop the page behind from scrolling,
 * and keep keyboard focus inside the dialog.
 *
 * The focus trap is what makes a modal usable without a mouse. Without it, Tab
 * walks straight out of the dialog and into the page behind — which is still
 * rendered, so a keyboard or screen-reader user ends up operating controls they
 * cannot see while a dialog is supposedly blocking them.
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {object}   [containerRef]  ref to the dialog element; without it the
 *                                   Escape and scroll-lock behaviour still work
 *                                   and only the trap is skipped.
 */
const useModalBehaviour = (isOpen, onClose, containerRef) => {
  // Where focus was before the dialog opened, so it can be handed back.
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocused.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }

      if (e.key !== 'Tab' || !containerRef?.current) return;

      const focusable = [...containerRef.current.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null || node === document.activeElement
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap around at both ends rather than letting focus escape.
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!containerRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so the first Tab lands somewhere sensible.
    const focusTimer = setTimeout(() => {
      if (!containerRef?.current) return;
      if (containerRef.current.contains(document.activeElement)) return;
      const target = containerRef.current.querySelector(FOCUSABLE) || containerRef.current;
      target.focus?.();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Hand focus back to whatever opened the dialog.
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose, containerRef]);
};

export default useModalBehaviour;
