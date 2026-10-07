import {
  DEFAULT_PROFILE,
  normalizeSiteProfile,
  PROFILE_SIZE_LIMIT,
  profileByteSize,
  directImageUrl,
  resolveLogo,
  SOCIAL_BASES,
  socialUrl
} from './siteProfile';

describe('normalizeSiteProfile', () => {
  it('renders the original site when nothing has been saved', () => {
    const profile = normalizeSiteProfile(null);
    expect(profile.councilName).toBe('Supreme Student Council');
    expect(profile.campusName).toBe('PSU Urdaneta City Campus');
    expect(profile.email).toBe('ssc.urdanetacampus@psu.edu.ph');
    expect(profile.coreValues.length).toBeGreaterThan(0);
  });

  it('keeps what the council typed', () => {
    const profile = normalizeSiteProfile({ councilName: 'Student Council', phone: '(075) 111-2222' });
    expect(profile.councilName).toBe('Student Council');
    expect(profile.phone).toBe('(075) 111-2222');
  });

  it('falls back rather than blanking the site when a field is cleared', () => {
    // Clearing the phone box must not leave an empty line in the footer where a
    // number used to be.
    const profile = normalizeSiteProfile({ phone: '   ', email: '' });
    expect(profile.phone).toBe(DEFAULT_PROFILE.phone);
    expect(profile.email).toBe(DEFAULT_PROFILE.email);
  });

  it('treats a cleared logo as a real choice, not a blank to backfill', () => {
    // Empty means "use the logo bundled with the site", which is what
    // resolveLogo then supplies.
    expect(normalizeSiteProfile({ sscLogoUrl: '' }).sscLogoUrl).toBe('');
    expect(normalizeSiteProfile({ sscLogoUrl: 'https://x.test/a.png' }).sscLogoUrl).toBe('https://x.test/a.png');
  });

  it('drops empty rows from the repeatable lists', () => {
    const profile = normalizeSiteProfile({
      coreValues: [{ title: 'Service', description: 'We serve.' }, { title: '', description: '' }],
      goals: ['Do the thing', '   ', '']
    });
    expect(profile.coreValues).toEqual([{ title: 'Service', description: 'We serve.' }]);
    expect(profile.goals).toEqual(['Do the thing']);
  });

  it('restores the built-in lists when every row was removed', () => {
    const profile = normalizeSiteProfile({ coreValues: [], goals: [] });
    expect(profile.coreValues).toEqual(DEFAULT_PROFILE.coreValues);
    expect(profile.goals).toEqual(DEFAULT_PROFILE.goals);
  });

  it('leaves an unset social link empty so no icon is rendered', () => {
    const profile = normalizeSiteProfile({});
    expect(profile.instagram).toBe('');
    expect(profile.youtube).toBe('');
  });
});

describe('socialUrl', () => {
  /*
   * The failure this prevents: a bare handle or a scheme-less domain in an href
   * is read as a *relative path*, so the link navigates inside this site rather
   * than going anywhere — broken, but still looking like a link.
   */
  it('turns a handle into a real link', () => {
    expect(socialUrl('@PSUurdanetaSSC', SOCIAL_BASES.facebook)).toBe('https://facebook.com/PSUurdanetaSSC');
    expect(socialUrl('PSUurdanetaSSC', SOCIAL_BASES.instagram)).toBe('https://instagram.com/PSUurdanetaSSC');
  });

  it('adds the scheme to a bare domain', () => {
    expect(socialUrl('facebook.com/PSUurdanetaSSC', SOCIAL_BASES.facebook)).toBe(
      'https://facebook.com/PSUurdanetaSSC'
    );
  });

  it('leaves a full link alone', () => {
    expect(socialUrl('https://facebook.com/x', SOCIAL_BASES.facebook)).toBe('https://facebook.com/x');
    expect(socialUrl('http://facebook.com/x', SOCIAL_BASES.facebook)).toBe('http://facebook.com/x');
  });

  it('never produces a relative path', () => {
    for (const input of ['@a', 'a', 'a.com', 'a.com/b']) {
      expect(socialUrl(input, SOCIAL_BASES.facebook).startsWith('http')).toBe(true);
    }
  });

  it('stays empty for nothing', () => {
    expect(socialUrl('', SOCIAL_BASES.facebook)).toBe('');
    expect(socialUrl('   ', SOCIAL_BASES.facebook)).toBe('');
  });
});

describe('resolveLogo', () => {
  it('prefers the uploaded logo and falls back to the bundled one', () => {
    expect(resolveLogo('https://x.test/a.png', 'bundled.svg')).toBe('https://x.test/a.png');
    expect(resolveLogo('', 'bundled.svg')).toBe('bundled.svg');
    expect(resolveLogo('   ', 'bundled.svg')).toBe('bundled.svg');
  });
});

describe('profileByteSize', () => {
  it('leaves the defaults far inside the limit', () => {
    expect(profileByteSize(DEFAULT_PROFILE)).toBeLessThan(PROFILE_SIZE_LIMIT);
  });

  it('catches a logo pasted in as a data URL', () => {
    // Firestore refuses any document over 1 MiB, and an uploaded logo becomes a
    // base64 data URL inside this one whenever Storage is not enabled.
    const huge = { ...DEFAULT_PROFILE, sscLogoUrl: `data:image/png;base64,${'A'.repeat(1_000_000)}` };
    expect(profileByteSize(huge)).toBeGreaterThan(PROFILE_SIZE_LIMIT);
  });
});


describe('directImageUrl', () => {
  /*
   * The point of this: a Drive share link opens Drive's own viewer, which
   * frames the file in Drive's interface with its filename on show. The council
   * asked for the chart picture and nothing else, so a Drive link is rewritten
   * to the endpoint that returns just the image.
   */
  it('rewrites a Drive share link to the image itself', () => {
    expect(directImageUrl('https://drive.google.com/file/d/1AbC_def-123456789/view?usp=sharing'))
      .toBe('https://drive.google.com/thumbnail?id=1AbC_def-123456789&sz=w2000');
  });

  it('handles the open?id= form of a Drive link', () => {
    expect(directImageUrl('https://drive.google.com/open?id=1AbC_def-123456789'))
      .toBe('https://drive.google.com/thumbnail?id=1AbC_def-123456789&sz=w2000');
  });

  it('leaves an ordinary image URL alone', () => {
    expect(directImageUrl('https://example.com/chart.png')).toBe('https://example.com/chart.png');
  });

  it('leaves an uploaded data URL alone', () => {
    expect(directImageUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('stays empty for nothing, so the button is simply not shown', () => {
    expect(directImageUrl('')).toBe('');
    expect(directImageUrl('   ')).toBe('');
    expect(directImageUrl(undefined)).toBe('');
  });
});

describe('the chart is optional', () => {
  it('is empty until a council sets one', () => {
    expect(normalizeSiteProfile(null).orgChartUrl).toBe('');
  });

  it('keeps what was set, and lets it be cleared again', () => {
    expect(normalizeSiteProfile({ orgChartUrl: 'https://x.test/c.png' }).orgChartUrl)
      .toBe('https://x.test/c.png');
    expect(normalizeSiteProfile({ orgChartUrl: '' }).orgChartUrl).toBe('');
  });
});
