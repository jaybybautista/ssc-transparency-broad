import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import useModalBehaviour from './useModalBehaviour';

/**
 * The bug this pins down: typing one character into any admin form moved the
 * caret to the dialog's close button.
 *
 * Every call site passes an inline arrow as `onClose`, so its identity changes
 * on each render of the page owning the dialog. While `onClose` was in the
 * effect's dependency array, one keystroke tore the effect down — handing focus
 * back to whatever opened the dialog — and rebuilt it, which pulled focus to
 * the first control inside, the close button. Ten admin forms were affected.
 *
 * Which of these tests actually catch it, stated plainly: the two that measure
 * the *cause* — "does not rebuild its listeners" and the scroll lock. Both fail
 * against the old dependency array. The focus assertions do NOT discriminate in
 * jsdom, because jsdom ignores `focus()` on an unfocusable element where a real
 * browser blurs the input, so the steal never manifests here. They are kept as
 * a statement of intended behaviour, not relied on as the guard: if the effect
 * stops rebuilding, the focus steal cannot occur.
 */

global.IS_REACT_ACT_ENVIRONMENT = true;

/** Mirrors the real admin forms: state in the parent, inline arrow onClose. */
const Dialog = ({ onEveryRender }) => {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(true);
  const dialogRef = useRef(null);

  // Deliberately an inline arrow, exactly as every real call site writes it.
  useModalBehaviour(open, () => setOpen(false), dialogRef);

  onEveryRender?.();

  if (!open) return null;
  return (
    <div ref={dialogRef}>
      {/* First focusable in the dialog — the one focus used to jump to. */}
      <button type="button" data-testid="close" onClick={() => setOpen(false)}>
        Close
      </button>
      <input
        data-testid="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );
};

describe('useModalBehaviour', () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  /** Lets the hook's queued focus move actually run. */
  const settle = () => act(() => { jest.advanceTimersByTime(1); });

  const type = (input, value) => {
    // Drive React's onChange the way a real keystroke does.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('keeps focus in the field while typing', () => {
    act(() => root.render(<Dialog />));

    const input = container.querySelector('[data-testid="name"]');
    const close = container.querySelector('[data-testid="close"]');

    settle();
    act(() => input.focus());
    expect(document.activeElement).toBe(input);

    act(() => type(input, 'E'));
    settle();

    // Intended behaviour. See the note above: in jsdom this passes either way,
    // so the real guard is the rebuild test below.
    expect(document.activeElement).not.toBe(close);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('E');
  });

  it('survives many keystrokes, not just the first', () => {
    act(() => root.render(<Dialog />));
    settle();
    const input = container.querySelector('[data-testid="name"]');
    act(() => input.focus());

    for (const value of ['E', 'Em', 'Emm', 'Emme', 'Emmer', 'Emmery']) {
      act(() => type(input, value));
      settle();
      expect(document.activeElement).toBe(input);
    }
    expect(input.value).toBe('Emmery');
  });

  it('still closes on Escape, using the latest handler', () => {
    act(() => root.render(<Dialog />));
    const input = container.querySelector('[data-testid="name"]');

    // Type first, so the handler in the ref has been replaced at least once.
    act(() => type(input, 'E'));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container.querySelector('[data-testid="name"]')).toBeNull();
  });

  it('does not rebuild its listeners on every render', () => {
    // THE guard. Directly measures the cause: the effect must run once for an
    // open dialog, not once per keystroke. Fails against the old deps array.
    const addSpy = jest.spyOn(document, 'addEventListener');
    act(() => root.render(<Dialog />));
    const afterMount = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;

    const input = container.querySelector('[data-testid="name"]');
    act(() => type(input, 'A'));
    act(() => type(input, 'AB'));

    const afterTyping = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
    expect(afterTyping).toBe(afterMount);
    addSpy.mockRestore();
  });

  // Also fails against the old code: rebuilding the effect on every keystroke
  // left the scroll lock behind, so the page under a closed dialog stayed
  // unscrollable once you had typed in it.
  it('locks the page behind the dialog and releases it on close', () => {
    act(() => root.render(<Dialog />));
    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
