/**
 * Bridge so plain modules (which cannot use React hooks) can raise the in-app
 * dialog. DialogProvider registers itself on mount; until then we fall back to
 * the native alert so a message is never silently lost.
 */
let handler = null;

export const registerNotifier = (fn) => {
  handler = fn;
};

export const notifyOutsideReact = (options) => {
  if (handler) {
    handler(options);
    return;
  }
  const message = typeof options === 'string' ? options : options?.message || '';
  if (message) window.alert(message);
};
