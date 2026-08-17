/**
 * Helpers for the rich text editor / renderer pair.
 *
 * Content is authored by admins and stored as an HTML string. It is still
 * sanitized on the way out so a bad value in the database can never inject
 * script or event handlers into the public pages.
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN',
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'MARK', 'SUB', 'SUP',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI',
  'BLOCKQUOTE', 'PRE', 'CODE', 'HR',
  'A'
]);

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'style']);

// Only these inline styles survive — enough for alignment, nothing that can load a resource.
const ALLOWED_STYLE_PROPS = new Set(['text-align', 'font-weight', 'font-style', 'text-decoration']);

const isSafeHref = (href) => {
  const value = (href || '').trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith('#') || value.startsWith('/')) return true;
  return /^(https?:|mailto:|tel:)/.test(value);
};

const sanitizeStyle = (styleValue) =>
  (styleValue || '')
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const [prop, val = ''] = rule.split(':');
      if (!ALLOWED_STYLE_PROPS.has((prop || '').trim().toLowerCase())) return false;
      return !/url\(|expression|javascript:/i.test(val);
    })
    .join('; ');

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** True when the stored value is legacy plain text rather than authored HTML. */
export const isPlainText = (value) => !/<[a-z][\s\S]*>/i.test(value || '');

/** Legacy plain-text records keep their line breaks when shown as rich content. */
export const toRichHtml = (value) => {
  if (!value) return '';
  if (!isPlainText(value)) return value;
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
};

export const sanitizeHtml = (html) => {
  if (!html) return '';
  if (typeof window === 'undefined' || !window.DOMParser) return '';

  const docContent = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const root = docContent.body;

  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }

      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Keep the readable text, drop the disallowed wrapper entirely.
        const text = docContent.createTextNode(child.textContent || '');
        child.replaceWith(text);
        return;
      }

      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
          child.removeAttribute(attr.name);
          return;
        }
        if (name === 'href' && !isSafeHref(attr.value)) {
          child.removeAttribute(attr.name);
          return;
        }
        if (name === 'style') {
          const safeStyle = sanitizeStyle(attr.value);
          if (safeStyle) child.setAttribute('style', safeStyle);
          else child.removeAttribute('style');
        }
      });

      if (child.tagName === 'A' && child.getAttribute('href')) {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }

      walk(child);
    });
  };

  walk(root);
  return root.innerHTML;
};

/** Plain-text version of rich content, for card previews and search. */
export const richTextToPlain = (value) => {
  if (!value) return '';
  if (isPlainText(value)) return value;
  if (typeof window === 'undefined' || !window.DOMParser) return '';
  const docContent = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html');
  return (docContent.body.textContent || '').replace(/\s+/g, ' ').trim();
};
