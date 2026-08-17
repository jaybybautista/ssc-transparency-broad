import { sanitizeHtml, toRichHtml, richTextToPlain, isPlainText } from './richText';

describe('sanitizeHtml', () => {
  it('keeps ordinary formatting tags', () => {
    const result = sanitizeHtml('<p>Hello <b>bold</b> and <i>italic</i></p>');
    expect(result).toBe('<p>Hello <b>bold</b> and <i>italic</i></p>');
  });

  it('keeps headings, lists and quotes', () => {
    const html = '<h2>Title</h2><ul><li>one</li></ul><blockquote>quote</blockquote>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('removes script tags but keeps surrounding text', () => {
    const result = sanitizeHtml('<p>safe</p><script>alert(1)</script>');
    expect(result).not.toMatch(/<script/i);
    expect(result).toContain('<p>safe</p>');
  });

  it('strips inline event handlers', () => {
    const result = sanitizeHtml('<p onclick="alert(1)">text</p>');
    expect(result).toBe('<p>text</p>');
  });

  it('drops javascript: hrefs but keeps the link text', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toMatch(/javascript:/i);
    expect(result).toContain('click');
  });

  it('keeps http links and forces safe target/rel', () => {
    const result = sanitizeHtml('<a href="https://example.com">site</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });

  it('unwraps disallowed tags such as img and iframe', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)"><iframe src="evil"></iframe><p>kept</p>');
    expect(result).not.toMatch(/<img|<iframe/i);
    expect(result).toContain('<p>kept</p>');
  });

  it('allows text-align styles but removes url() styles', () => {
    const aligned = sanitizeHtml('<p style="text-align: center">mid</p>');
    expect(aligned).toContain('text-align: center');

    const bad = sanitizeHtml('<p style="background: url(javascript:alert(1))">x</p>');
    expect(bad).not.toMatch(/url\(/i);
  });
});

describe('toRichHtml', () => {
  it('escapes and line-breaks legacy plain text', () => {
    expect(toRichHtml('line one\nline two')).toBe('line one<br />line two');
    expect(toRichHtml('5 < 6 & 7 > 2')).toContain('&lt;');
  });

  it('leaves authored html untouched', () => {
    expect(toRichHtml('<p>hi</p>')).toBe('<p>hi</p>');
  });
});

describe('richTextToPlain', () => {
  it('flattens html to searchable text', () => {
    expect(richTextToPlain('<p>Hello <b>bold</b></p>')).toBe('Hello bold');
  });

  it('returns plain text unchanged', () => {
    expect(richTextToPlain('just text')).toBe('just text');
  });
});

describe('isPlainText', () => {
  it('detects markup', () => {
    expect(isPlainText('no tags here')).toBe(true);
    expect(isPlainText('<p>tags</p>')).toBe(false);
  });
});
