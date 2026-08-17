/**
 * English and Filipino for the interface.
 *
 * Scope, stated plainly: this translates the board's *chrome* — navigation,
 * buttons, labels, section descriptions. It does NOT translate the council's
 * own content. An announcement written in Filipino stays in Filipino and one
 * written in English stays in English, because machine-translating an official
 * notice would misrepresent what the SSC actually said. If a post needs to
 * appear in both, write it in both.
 *
 * Filipino here is the register a campus council actually uses: Taglish where
 * that is the natural form ("Calendar of Activities" is not translated to
 * "Kalendaryo ng mga Gawain" in ordinary speech), and plain Filipino where a
 * translation is genuinely idiomatic.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fil', label: 'Filipino', short: 'FIL' }
];

const dictionary = {
  // ---- navigation ----
  'nav.transparencyBoard': ['Virtual Transparency Board', 'Virtual Transparency Board'],
  'nav.calendar': ['Calendar of Activities', 'Kalendaryo ng mga Aktibidad'],
  'nav.ssc': ['SSC', 'SSC'],
  'nav.contact': ['Connect with SSC', 'Makipag-ugnayan sa SSC'],
  'nav.admin': ['Admin', 'Admin'],
  'nav.overview': ['Overview', 'Buod'],
  'nav.announcements': ['Announcements', 'Mga Anunsyo'],
  'nav.memorandum': ['Memorandum Orders', 'Mga Memorandum Order'],
  'nav.about': ['About SSC', 'Tungkol sa SSC'],
  'nav.constitution': ['Constitution & By-Laws', 'Konstitusyon at Alituntunin'],
  'nav.resolutions': ['Resolutions', 'Mga Resolusyon'],
  'nav.minutes': ['Minutes of Meeting', 'Katitikan ng Pulong'],
  'nav.reports': ['Narrative Reports', 'Mga Narrative Report'],
  'nav.accomplishments': ['Accomplishment Tracker', 'Talaan ng mga Nagawa'],
  'nav.requestLetters': ['Request Letters', 'Mga Request Letter'],
  'nav.openMenu': ['Open menu', 'Buksan ang menu'],
  'nav.returnAsUser': ['Return as User', 'Bumalik bilang User'],

  // ---- common actions ----
  'action.search': ['Search', 'Maghanap'],
  'action.close': ['Close', 'Isara'],
  'action.cancel': ['Cancel', 'Kanselahin'],
  'action.save': ['Save', 'I-save'],
  'action.delete': ['Delete', 'Burahin'],
  'action.edit': ['Edit', 'I-edit'],
  'action.submit': ['Submit', 'Isumite'],
  'action.download': ['Download', 'I-download'],
  'action.viewMore': ['See More', 'Tingnan pa'],
  'action.loadOlder': ['Load older', 'Tingnan ang mas luma'],
  'action.backToBoard': ['Back to the board', 'Bumalik sa board'],
  'action.tryAgain': ['Try again', 'Subukan muli'],
  'action.reload': ['Reload the page', 'I-reload ang pahina'],
  'action.notifyMe': ['Notify me', 'Ipaalam sa akin'],
  'action.alertsOn': ['Alerts on', 'Naka-on ang alerts'],

  // ---- search ----
  'search.placeholder': [
    'Search announcements, resolutions, officers, activities…',
    'Maghanap ng anunsyo, resolusyon, opisyal, aktibidad…'
  ],
  'search.minChars': ['Type at least two letters.', 'Mag-type ng hindi bababa sa dalawang letra.'],
  'search.nothingFound': ['Nothing found for', 'Walang nahanap para sa'],
  'search.results': ['results', 'resulta'],
  'search.result': ['result', 'resulta'],

  // ---- academic year ----
  'year.label': ['Academic year', 'Taong Panuruan'],
  'year.current': ['Current', 'Kasalukuyan'],
  'year.archiveNotice': [
    'You are viewing the archive for',
    'Tinitingnan mo ang archive para sa'
  ],
  'year.notCurrent': [
    "This is not the current council's work.",
    'Hindi ito ang gawa ng kasalukuyang konseho.'
  ],
  'year.backTo': ['Back to', 'Bumalik sa'],

  // ---- errors ----
  'error.pageTitle': ['This page could not be displayed', 'Hindi maipakita ang pahinang ito'],
  'error.pageBody': [
    'The rest of the board is still working — you can go back and try another section.',
    'Gumagana pa ang ibang bahagi ng board — maaari kang bumalik at pumili ng ibang seksyon.'
  ],
  'error.generic': ['Something went wrong', 'May naganap na problema'],
  'error.genericBody': [
    'The page hit an unexpected error. Reloading usually clears it.',
    'May hindi inaasahang error. Kadalasan, naaayos ito sa pag-reload.'
  ],
  'error.details': ['Technical details', 'Teknikal na detalye'],

  // ---- app prompts ----
  'pwa.updateReady': [
    'A newer version of the board is ready.',
    'Handa na ang mas bagong bersyon ng board.'
  ],
  'pwa.install': [
    'Add the board to your home screen for quicker access offline.',
    'Idagdag ang board sa iyong home screen para mas mabilis kahit offline.'
  ],
  'pwa.installAction': ['Install', 'I-install'],

  // ---- accessibility ----
  'a11y.skipToContent': ['Skip to main content', 'Tumalon sa pangunahing nilalaman'],
  'a11y.switchToDark': ['Switch to dark mode', 'Lumipat sa dark mode'],
  'a11y.switchToLight': ['Switch to light mode', 'Lumipat sa light mode'],
  'a11y.searchBoard': ['Search the board', 'Maghanap sa board'],

  // ---- footer ----
  'footer.quickLinks': ['Quick Links', 'Mabilisang Link'],
  'footer.resources': ['SSC Resources', 'Mga Sanggunian ng SSC'],
  'footer.contact': ['Contact Us', 'Makipag-ugnayan'],
  'footer.rights': ['All rights reserved.', 'Nakalaan ang lahat ng karapatan.'],
  'footer.developedWith': ['Developed with', 'Ginawa nang may'],
  'footer.forStudentWelfare': ['for Student Welfare', 'para sa Kapakanan ng mga Mag-aaral'],

  // ---- content language notice ----
  'lang.contentNotice': [
    'The interface is translated; posts stay in the language the council wrote them in.',
    'Isinalin ang interface; nananatili ang mga post sa wikang ginamit ng konseho.'
  ]
};

const INDEX = { en: 0, fil: 1 };

/**
 * Looks up a phrase. Falls back to English, then to the key itself — a missing
 * translation should show readable English, never a blank or a raw key.
 */
export const translate = (language, key) => {
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[INDEX[language] ?? 0] || entry[0] || key;
};

export const translationKeys = () => Object.keys(dictionary);
