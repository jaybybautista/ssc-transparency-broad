/**
 * The council's own details: who it is, how to reach it, and what it stands for.
 *
 * All of this used to be typed into the components — the name in the navbar, the
 * address and phone number in the footer, the mission and vision in a data file
 * shipped with the code. That meant the only way to correct a phone number or
 * put a new logo up was to edit React and redeploy the site, which no incoming
 * council should have to do. It also let the same fact drift: the footer showed
 * one phone number and the contact page another.
 *
 * Now it lives in one Firestore document, `settings/profile`, editable from
 * Admin -> Site Profile. Every field falls back to what the site showed before,
 * so an empty document renders exactly the site that existed already, and a
 * council that never touches this page notices nothing.
 */

/** What the site showed before any of this was editable. */
export const DEFAULT_PROFILE = {
  // ---- identity ----
  councilName: 'Supreme Student Council',
  councilShortName: 'SSC',
  campusName: 'PSU Urdaneta City Campus',
  universityName: 'Pangasinan State University',

  // ---- logos ----
  // Blank means "use the logo bundled with the site", which is what the
  // components fall back to. See resolveLogo.
  sscLogoUrl: '',
  psuLogoUrl: '',

  // The council's organisational chart poster. Blank means the button that
  // opens it is not shown at all, rather than opening an empty frame.
  orgChartUrl: '',

  // ---- contact ----
  email: 'ssc.urdanetacampus@psu.edu.ph',
  phone: '(075) 568-2361',
  officeLocation: 'PSU Urdaneta City Campus, Pangasinan',
  officeAddress: 'PSU Urdaneta City Campus, San Vicente West, Urdaneta City, Pangasinan',
  officeHours: 'Monday - Friday, 8:00 AM - 5:00 PM',

  // ---- social ----
  facebook: 'https://facebook.com/PSUurdanetaSSC',
  instagram: '',
  twitter: '',
  youtube: '',
  tiktok: '',

  // ---- what the council stands for ----
  mission:
    'To serve as the voice of the students, advocating for student rights and welfare while fostering a culture of excellence, integrity, and service. We commit to providing transparent governance, promoting student engagement, and creating meaningful opportunities for personal and academic growth at PSU Urdaneta City Campus.',
  vision:
    'A united, empowered, and progressive student community where every voice is heard, every concern is addressed, and every student has the opportunity to reach their full potential.',
  coreValues: [
    { title: 'Integrity', description: 'We uphold honesty and transparency in all our actions and decisions.' },
    { title: 'Service', description: 'We dedicate ourselves to serving the needs of our fellow students.' },
    { title: 'Excellence', description: 'We strive for the highest standards in everything we do.' },
    { title: 'Unity', description: 'We work together as one body for the common good of all students.' },
    { title: 'Innovation', description: 'We embrace new ideas and approaches to better serve our constituents.' }
  ],
  goals: [
    'Strengthen student representation in university governance',
    'Enhance student services and welfare programs',
    'Foster academic excellence through support programs',
    'Build partnerships for student development opportunities',
    'Promote transparency and accountability in student government'
  ],

  // ---- footer ----
  footerDescription:
    'Pangasinan State University - Urdaneta City Campus. Promoting transparency, accountability, and student engagement through digital innovation.',
  copyrightName: 'PSU-UCC Supreme Student Council'
};

/**
 * A stored profile merged over the defaults.
 *
 * Field by field rather than a spread, because a blank string in the database
 * must fall back rather than blank out the site. An officer clearing the phone
 * box should not leave an empty line in the footer where a number used to be.
 */
export const normalizeSiteProfile = (stored) => {
  const source = stored || {};
  const text = (key) => {
    const value = source[key];
    return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_PROFILE[key];
  };

  // Logos are the exception: blank is a real choice meaning "use the bundled
  // logo", so they are not backfilled from the defaults, which are blank too.
  const logo = (key) => (typeof source[key] === 'string' ? source[key].trim() : '');

  const values = Array.isArray(source.coreValues)
    ? source.coreValues
        .filter((item) => item && (item.title || item.description))
        .map((item) => ({
          title: String(item.title || '').trim(),
          description: String(item.description || '').trim()
        }))
    : null;

  const goals = Array.isArray(source.goals)
    ? source.goals.map((goal) => String(goal || '').trim()).filter(Boolean)
    : null;

  return {
    councilName: text('councilName'),
    councilShortName: text('councilShortName'),
    campusName: text('campusName'),
    universityName: text('universityName'),

    sscLogoUrl: logo('sscLogoUrl'),
    psuLogoUrl: logo('psuLogoUrl'),
    orgChartUrl: logo('orgChartUrl'),

    email: text('email'),
    phone: text('phone'),
    officeLocation: text('officeLocation'),
    officeAddress: text('officeAddress'),
    officeHours: text('officeHours'),

    // Social links are optional, so an empty one stays empty and the icon is
    // simply not rendered. Only Facebook has a default, because it is the one
    // the site already linked to.
    facebook: typeof source.facebook === 'string' ? source.facebook.trim() : DEFAULT_PROFILE.facebook,
    instagram: typeof source.instagram === 'string' ? source.instagram.trim() : '',
    twitter: typeof source.twitter === 'string' ? source.twitter.trim() : '',
    youtube: typeof source.youtube === 'string' ? source.youtube.trim() : '',
    tiktok: typeof source.tiktok === 'string' ? source.tiktok.trim() : '',

    mission: text('mission'),
    vision: text('vision'),
    coreValues: values && values.length ? values : DEFAULT_PROFILE.coreValues,
    goals: goals && goals.length ? goals : DEFAULT_PROFILE.goals,

    footerDescription: text('footerDescription'),
    copyrightName: text('copyrightName')
  };
};

/**
 * Turns whatever an officer typed into something an href can use.
 *
 * People paste "@PSUurdanetaSSC", "facebook.com/x" and a full URL
 * interchangeably. A bare handle or a scheme-less domain in an href is read as
 * a *relative path*, so the link would quietly navigate inside this site
 * instead of going anywhere — a broken link that still looks like a link.
 */
export const socialUrl = (value, base) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('@')) return `${base}/${raw.slice(1)}`;
  if (raw.includes('.') && raw.includes('/')) return `https://${raw}`;
  if (raw.includes('.')) return `https://${raw}`;
  return `${base}/${raw}`;
};

export const SOCIAL_BASES = {
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  twitter: 'https://x.com',
  youtube: 'https://youtube.com',
  tiktok: 'https://tiktok.com/@'
};

/** The stored logo if there is one, otherwise the logo bundled with the site. */
export const resolveLogo = (stored, bundled) => (stored && stored.trim() ? stored.trim() : bundled);

/**
 * Roughly how large the document will be once written.
 *
 * Matters because an uploaded logo becomes a base64 data URL inside this
 * document when Firebase Storage is not enabled, and Firestore refuses any
 * document over 1 MiB. Without this check the save fails with a raw API error
 * after the officer has already filled the whole form in.
 */
export const profileByteSize = (profile) => {
  try {
    return new Blob([JSON.stringify(profile)]).size;
  } catch (error) {
    return JSON.stringify(profile).length;
  }
};

/** Firestore's hard limit is 1 MiB; stop well short of it. */
export const PROFILE_SIZE_LIMIT = 900 * 1024;


/**
 * A URL that renders the image itself, with nothing around it.
 *
 * A Google Drive share link points at Drive's own viewer, which frames the file
 * in Drive's interface — including its filename. The council does not
 * necessarily want the name of a working file shown to students, so a Drive
 * link is rewritten to the endpoint that returns just the picture. Anything
 * else is already a plain image URL and is used unchanged.
 */
export const directImageUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return '';

  const drive =
    raw.match(/\/file\/d\/([\w-]{10,})/) ||
    raw.match(/[?&]id=([\w-]{10,})/) ||
    raw.match(/\/d\/([\w-]{10,})/);

  // sz=w2000 asks for a copy wide enough to read a chart full of names.
  return drive ? `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w2000` : raw;
};
