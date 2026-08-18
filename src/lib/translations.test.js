import fs from 'fs';
import path from 'path';
import { LANGUAGES, translate, translationKeys } from './translations';

describe('translate', () => {
  it('returns the right language', () => {
    expect(translate('en', 'nav.calendar')).toBe('Calendar of Activities');
    expect(translate('fil', 'nav.calendar')).toBe('Kalendaryo ng mga Aktibidad');
  });

  it('falls back to English for an unknown language rather than going blank', () => {
    expect(translate('es', 'nav.calendar')).toBe('Calendar of Activities');
  });

  it('returns the key itself for a missing entry', () => {
    // Deliberate: a visible key in the UI is a far louder bug report than an
    // empty space, which is why the guard below exists.
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });
});

describe('dictionary completeness', () => {
  it('has a Filipino string for every key', () => {
    const missing = translationKeys().filter((key) => {
      const fil = translate('fil', key);
      return !fil || fil === key;
    });
    expect(missing).toEqual([]);
  });

  it('has no key whose two languages are accidentally identical prose', () => {
    // Some are legitimately the same — proper names, "SSC", "Admin". Anything
    // longer than a few words being identical means a translation was skipped.
    const suspicious = translationKeys().filter((key) => {
      const en = translate('en', key);
      const fil = translate('fil', key);
      return en === fil && en.split(/\s+/).length > 4;
    });
    expect(suspicious).toEqual([]);
  });
});

/**
 * The failure this catches: calling t('some.key') for a key that was never
 * added. `translate` returns the key itself, so the interface silently displays
 * "ann.subtitle" to a student. That happened once during development; this
 * makes it a failing test instead of something to spot by eye.
 */
describe('every t() call in the source has a dictionary entry', () => {
  const SRC = path.join(__dirname, '..');

  const walk = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) out.push(full);
    }
    return out;
  };

  it('finds no orphan keys', () => {
    const known = new Set(translationKeys());
    const orphans = [];

    for (const file of walk(SRC)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bt\(\s*'([\w.]+)'\s*\)/g)) {
        if (!known.has(match[1])) {
          orphans.push(`${path.relative(SRC, file)} -> ${match[1]}`);
        }
      }
    }

    expect(orphans).toEqual([]);
  });
});

describe('LANGUAGES', () => {
  it('lists exactly the two languages the toggle offers', () => {
    expect(LANGUAGES.map((entry) => entry.code)).toEqual(['en', 'fil']);
  });
});
