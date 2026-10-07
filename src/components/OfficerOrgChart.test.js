import { splitName } from './OfficerOrgChart';

/**
 * The printed chart puts the family name on the badge and the rest beneath it.
 * Names are entered "Given M. Surname", so the last word is normally the
 * surname — but local surnames often carry a particle ("De Guzman", "Dela
 * Cruz"), and splitting those on the last word alone would badge an officer as
 * "GUZMAN".
 */
describe('splitName', () => {
  it('puts the family name on the badge', () => {
    expect(splitName('Chester A. Agnote')).toEqual({ surname: 'Agnote', given: 'Chester A.' });
    expect(splitName('Eirene Dorothy P. Amolacion'))
      .toEqual({ surname: 'Amolacion', given: 'Eirene Dorothy P.' });
  });

  it('keeps a multi-word surname together', () => {
    expect(splitName('Robert B. De Guzman')).toEqual({ surname: 'De Guzman', given: 'Robert B.' });
    expect(splitName('Maria Dela Cruz')).toEqual({ surname: 'Dela Cruz', given: 'Maria' });
  });

  it('copes with a single name', () => {
    expect(splitName('Takeshi')).toEqual({ surname: 'Takeshi', given: '' });
  });

  it('tidies stray whitespace rather than producing empty parts', () => {
    expect(splitName('  Zach   F.   Mabasa ')).toEqual({ surname: 'Mabasa', given: 'Zach F.' });
  });

  it('is safe on missing data', () => {
    expect(splitName('')).toEqual({ surname: '', given: '' });
    expect(splitName(undefined)).toEqual({ surname: '', given: '' });
  });
});
