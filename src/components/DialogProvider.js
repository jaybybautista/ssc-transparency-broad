import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiInfo, FiTrash2, FiX, FiCheckCircle } from 'react-icons/fi';
import { registerNotifier } from '../lib/notifier';
import './DialogProvider.css';

const DialogContext = createContext(null);

const normaliseOptions = (options) =>
  typeof options === 'string' ? { message: options } : options || {};

/**
 * In-app replacement for window.confirm / alert / prompt.
 *
 * The native dialogs are synchronous, so callers used `if (window.confirm(...))`.
 * These return a Promise instead, so a call site becomes:
 *
 *   const ok = await confirm({ title: 'Delete this?', tone: 'danger' });
 *   if (ok) doTheThing();
 */
export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const confirmButtonRef = useRef(null);
  const inputRef = useRef(null);

  const open = useCallback(
    (kind, options) =>
      new Promise((resolve) => {
        const config = normaliseOptions(options);
        setInputValue(config.defaultValue || '');
        setDialog({ kind, ...config, resolve });
      }),
    []
  );

  const confirm = useCallback((options) => open('confirm', options), [open]);
  const notify = useCallback((options) => open('notify', options), [open]);
  const prompt = useCallback((options) => open('prompt', options), [open]);

  // Let non-React modules (e.g. src/lib/uploads.js) raise this dialog too.
  useEffect(() => registerNotifier(notify), [notify]);

  const settle = useCallback(
    (result) => {
      setDialog((current) => {
        current?.resolve(result);
        return null;
      });
    },
    []
  );

  // Focus the primary control so the dialog is keyboard-usable immediately.
  useEffect(() => {
    if (!dialog) return;
    const target = dialog.kind === 'prompt' ? inputRef.current : confirmButtonRef.current;
    target?.focus();
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        settle(dialog.kind === 'confirm' || dialog.kind === 'prompt' ? false : undefined);
      }
    };

    // Capture phase so this wins over the underlying modal's Escape handler.
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [dialog, settle]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dialog.kind === 'prompt') {
      settle(inputValue.trim() ? inputValue.trim() : false);
      return;
    }
    settle(dialog.kind === 'confirm' ? true : undefined);
  };

  const tone = dialog?.tone || (dialog?.kind === 'confirm' ? 'danger' : 'info');
  const icon =
    tone === 'danger' ? <FiTrash2 /> : tone === 'warning' ? <FiAlertTriangle /> : tone === 'success' ? <FiCheckCircle /> : <FiInfo />;

  const defaultTitle = {
    confirm: 'Please confirm',
    notify: 'Notice',
    prompt: 'Enter a value'
  };

  return (
    <DialogContext.Provider value={{ confirm, notify, prompt }}>
      {children}

      {dialog && (
        <div
          className="app-dialog-overlay"
          onClick={() => settle(dialog.kind === 'notify' ? undefined : false)}
        >
          <form
            className={`app-dialog tone-${tone}`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <button
              type="button"
              className="app-dialog-close"
              aria-label="Close"
              onClick={() => settle(dialog.kind === 'notify' ? undefined : false)}
            >
              <FiX />
            </button>

            <div className="app-dialog-icon">{icon}</div>

            <h3 className="app-dialog-title">{dialog.title || defaultTitle[dialog.kind]}</h3>

            {!!dialog.message && <p className="app-dialog-message">{dialog.message}</p>}

            {dialog.kind === 'prompt' && (
              <input
                ref={inputRef}
                type={dialog.inputType || 'text'}
                className="app-dialog-input"
                value={inputValue}
                placeholder={dialog.placeholder || ''}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}

            <div className="app-dialog-actions">
              {dialog.kind !== 'notify' && (
                <button type="button" className="app-dialog-btn cancel" onClick={() => settle(false)}>
                  {dialog.cancelLabel || 'Cancel'}
                </button>
              )}
              <button ref={confirmButtonRef} type="submit" className="app-dialog-btn primary">
                {dialog.confirmLabel || (dialog.kind === 'notify' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
};
