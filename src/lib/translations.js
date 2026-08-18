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


  // ---- shared across pages ----
  'common.seeMore': ['See More', 'Tingnan pa'],
  'common.readMore': ['Read more', 'Basahin pa'],
  'common.viewAll': ['View All', 'Tingnan lahat'],
  'common.view': ['View', 'Tingnan'],
  'common.read': ['Read', 'Basahin'],
  'common.download': ['Download', 'I-download'],
  'common.attachedDocument': ['Attached Document', 'Nakalakip na Dokumento'],
  'common.showing': ['Showing', 'Ipinapakita ang'],
  'common.clearFilter': ['Clear filter', 'Alisin ang filter'],
  'common.loading': ['Loading', 'Naglo-load'],
  'common.date': ['Date', 'Petsa'],
  'common.status': ['Status', 'Katayuan'],
  'common.category': ['Category', 'Kategorya'],
  'common.views': ['views', 'nakabasa'],
  'common.openFullScreen': ['Open Full Screen', 'Buksan nang buo'],
  'common.officialDocument': ['Official Document', 'Opisyal na Dokumento'],

  // ---- transparency board (home) ----
  'board.title': ['Virtual Transparency Board', 'Virtual Transparency Board'],
  'board.announcementsCard': ['Announcements', 'Mga Anunsyo'],
  'board.announcementsCardDesc': ['Official communications and updates', 'Mga opisyal na komunikasyon at update'],
  'board.memosCard': ['Memorandum Orders', 'Mga Memorandum Order'],
  'board.memosCardDesc': ['Official orders and directives', 'Mga opisyal na utos at direktiba'],
  'board.pinned': ['Important updates that require your attention', 'Mahahalagang update na dapat mong mabasa'],
  'board.recentMemos': ['Recent Memorandum Orders', 'Mga Bagong Memorandum Order'],
  'board.recentMemosDesc': ['Latest official directives and policies', 'Pinakabagong opisyal na direktiba at patakaran'],
  'board.stayUpdated': ['Stay Updated', 'Manatiling Updated'],
  'board.officialDocs': ['Official Documents', 'Mga Opisyal na Dokumento'],
  'board.questions': ['Have Questions?', 'May Katanungan?'],

  // ---- announcements ----
  'ann.title': ['Announcements', 'Mga Anunsyo'],
  'ann.search': ['Search announcements...', 'Maghanap ng anunsyo...'],
  'ann.recent': ['Recent Announcements', 'Mga Bagong Anunsyo'],
  'ann.pinned': ['Pinned', 'Naka-pin'],
  'ann.none': ['No announcements found matching your criteria.', 'Walang anunsyong tumugma sa iyong hinahanap.'],
  'ann.countOne': ['announcement', 'anunsyo'],
  'ann.countMany': ['announcements', 'na anunsyo'],
  'cat.all': ['All', 'Lahat'],
  'cat.admin': ['Admin Announcements', 'Mga Anunsyo ng Admin'],
  'cat.scholarship': ['Vacancies for Scholarships', 'Bakanteng Scholarship'],
  'cat.uniform': ['ID/UNIFORM', 'ID/UNIPORME'],
  'cat.leniency': ['Leniencies', 'Mga Leniency'],
  'cat.advisory': ['Advisory', 'Abiso'],

  // ---- memorandum orders ----
  'memo.title': ['Memorandum Orders', 'Mga Memorandum Order'],
  'memo.about': ['About Memorandum Orders', 'Tungkol sa Mga Memorandum Order'],
  'memo.issued': ['Issued', 'Inilabas'],
  'memo.effective': ['Effective', 'Epektibo'],
  'memo.downloadPdf': ['Download PDF', 'I-download ang PDF'],
  'memo.noFile': ['No document file has been attached to this memorandum yet.', 'Wala pang nakalakip na dokumento sa memorandum na ito.'],
  'memo.notifyMe': ['Notify me of new memoranda', 'Ipaalam sa akin ang bagong memorandum'],

  // ---- calendar ----
  'cal.title': ['Unified Calendar of Activities', 'Pinagsamang Kalendaryo ng mga Aktibidad'],
  'cal.legend': ['Status Legend', 'Gabay sa Katayuan'],
  'cal.planned': ['Planned', 'Nakaplano'],
  'cal.plannedHint': ['Event is scheduled', 'Nakatakda na ang gawain'],
  'cal.pending': ['Pending', 'Nakabinbin'],
  'cal.pendingHint': ['Awaiting approval', 'Hinihintay ang aprubasyon'],
  'cal.approved': ['Approved', 'Aprubado'],
  'cal.approvedHint': ['Confirmed event', 'Kumpirmado ang gawain'],
  'cal.today': ['Today', 'Ngayon'],
  'cal.filterByStatus': ['Filter by Status', 'Salain ayon sa Katayuan'],
  'cal.allStatus': ['All Status', 'Lahat ng Katayuan'],
  'cal.jumpToDate': ['Jump to a date', 'Pumunta sa petsa'],
  'cal.upcoming': ['Upcoming Events', 'Mga Paparating na Gawain'],
  'cal.noneOnDate': ['No events scheduled for this date.', 'Walang nakatakdang gawain sa petsang ito.'],
  'cal.addToCalendarHint': ['Adds this activity, with a reminder, to your own calendar app.', 'Idaragdag ito, kasama ang paalala, sa sarili mong calendar app.'],

  // ---- SSC landing ----
  'ssc.welcome': ['Welcome to SSC', 'Maligayang Pagdating sa SSC'],
  'ssc.learnAbout': ['Learn About SSC', 'Alamin ang Tungkol sa SSC'],
  'ssc.explore': ['Explore SSC', 'Tuklasin ang SSC'],
  'ssc.exploreShort': ['Explore', 'Tuklasin'],

  // ---- about / mission / officers ----
  'about.title': ['About SSC', 'Tungkol sa SSC'],
  'about.vision': ['Our Vision', 'Ang Aming Bisyon'],
  'about.mission': ['Our Mission', 'Ang Aming Misyon'],
  'about.values': ['Core Values', 'Pangunahing Pagpapahalaga'],
  'about.goals': ['Our Goals', 'Ang Aming Mga Layunin'],
  'about.commitment': ['Our Commitment', 'Ang Aming Pangako'],
  'about.message': ['A Message from Your Student Council', 'Mensahe mula sa Inyong Student Council'],
  'about.voiceMatters': ['Your voice matters.', 'Mahalaga ang inyong boses.'],
  'mv.title': ['Mission & Vision', 'Misyon at Bisyon'],
  'off.title': ['Meet the Officers', 'Makilala ang mga Opisyal'],
  'off.none': ['No officers yet', 'Wala pang opisyal'],

  // ---- constitution ----
  'con.title': ['Constitution & By-Laws', 'Konstitusyon at Alituntunin'],
  'con.about': ['About these documents', 'Tungkol sa mga dokumentong ito'],
  'con.none': ['No documents yet', 'Wala pang dokumento'],
  'con.version': ['Version', 'Bersyon'],
  'con.effectiveDate': ['Effective Date', 'Petsa ng Bisa'],

  // ---- resolutions ----
  'res.title': ['Resolutions', 'Mga Resolusyon'],
  'res.about': ['About Resolutions', 'Tungkol sa mga Resolusyon'],
  'res.votingResults': ['Voting Results', 'Resulta ng Botohan'],
  'res.for': ['For', 'Pabor'],
  'res.against': ['Against', 'Tutol'],
  'res.abstain': ['Abstain', 'Abstain'],
  'res.signInToVote': ['Sign in with Google to vote', 'Mag-sign in gamit ang Google para bumoto'],
  'res.votingAs': ['Voting as', 'Bumoboto bilang'],
  'res.signOut': ['Sign out', 'Mag-sign out'],
  'res.yourVote': ['Your vote:', 'Ang boto mo:'],

  // ---- minutes ----
  'mom.title': ['Minutes of Meeting', 'Katitikan ng Pulong'],
  'mom.about': ['About Minutes of Meeting', 'Tungkol sa Katitikan ng Pulong'],
  'mom.agenda': ['Agenda', 'Adyenda'],
  'mom.summary': ['Summary', 'Buod'],
  'mom.attendees': ['attendees', 'dumalo'],

  // ---- narrative reports ----
  'nar.title': ['Narrative Reports', 'Mga Narrative Report'],
  'nar.about': ['About Narrative Reports', 'Tungkol sa mga Narrative Report'],
  'nar.participants': ['participants', 'kalahok'],

  // ---- accomplishments ----
  'acc.title': ['Accomplishment Tracker', 'Talaan ng mga Nagawa'],
  'acc.completed': ['Completed', 'Tapos na'],
  'acc.inProgress': ['In Progress', 'Isinasagawa'],
  'acc.upcoming': ['Upcoming', 'Paparating'],
  'acc.viewPost': ['View Facebook Post', 'Tingnan sa Facebook'],

  // ---- request letters ----
  'req.title': ['Request Letters', 'Mga Request Letter'],
  'req.heading': ['Download Request Templates', 'I-download ang mga Template'],
  'req.requirements': ['Requirements:', 'Mga Kailangan:'],
  'req.viewTemplate': ['View Template', 'Tingnan ang Template'],
  'req.downloadTemplate': ['Download Template', 'I-download ang Template'],

  // ---- contact / portal ----
  'contact.title': ['Student Feedback & Query Portal', 'Portal ng Puna at Katanungan'],
  'contact.otherWays': ['Other ways to reach us', 'Iba pang paraan para makaugnayan kami'],
  'contact.office': ['Office Location', 'Lokasyon ng Opisina'],
  'contact.email': ['Email Address', 'Email Address'],
  'contact.phone': ['Phone Number', 'Numero ng Telepono'],
  'contact.hours': ['Office Hours', 'Oras ng Opisina'],
  'contact.connect': ['Connect with Us', 'Makipag-ugnayan sa Amin'],
  'contact.faq': ['Frequently Asked Questions', 'Mga Madalas Itanong'],

  // ---- calendar sync ----
  'sync.open': ['Sync to your own calendar', 'I-sync sa sarili mong kalendaryo'],
  'sync.addToCalendar': ['Add to my calendar', 'Idagdag sa kalendaryo ko'],

  // ---- load more ----
  'more.load': ['Load older', 'Tingnan ang mas luma'],


  // ---- page subtitles ----
  'board.subtitle': [
    'Access all official communications, announcements, and memorandums in one centralized platform. Stay informed and engaged with your student government.',
    'Tingnan ang lahat ng opisyal na komunikasyon, anunsyo, at memorandum sa iisang lugar. Manatiling updated at kabahagi ng inyong student government.'
  ],
  'ann.subtitle': [
    'Stay informed with the latest news, updates, and important information from the administration and Student Supreme Council.',
    'Manatiling updated sa pinakabagong balita at mahalagang impormasyon mula sa administrasyon at sa Supreme Student Council.'
  ],
  'memo.subtitle': [
    'Official directives, policies, and guidelines issued by the administration. Stay compliant and informed with the latest memorandums.',
    'Mga opisyal na direktiba, patakaran, at alituntunin mula sa administrasyon. Manatiling updated sa pinakabagong memorandum.'
  ],
  'cal.subtitle': [
    'View all scheduled events and activities. Color-coded for easy tracking of event status.',
    'Tingnan ang lahat ng nakatakdang gawain at aktibidad. May kulay para madaling masundan ang katayuan.'
  ],
  'about.subtitle': [
    'Learn about our mission, vision, and meet the dedicated student leaders who serve the student body.',
    'Alamin ang aming misyon at bisyon, at makilala ang mga lider-mag-aaral na naglilingkod sa inyo.'
  ],
  'mv.subtitle': [
    'Guiding principles that drive our commitment to serve the student body with excellence and integrity.',
    'Mga prinsipyong gumagabay sa aming paglilingkod sa mga mag-aaral nang may husay at integridad.'
  ],
  'con.subtitle': [
    'The governing documents of the Supreme Student Council \u2014 the constitution, by-laws, and their amendments.',
    'Ang mga dokumentong namamahala sa Supreme Student Council \u2014 ang konstitusyon, alituntunin, at mga susog nito.'
  ],
  'res.subtitle': [
    'Official resolutions passed by the Supreme Student Council addressing student concerns and initiatives.',
    'Mga opisyal na resolusyong ipinasa ng Supreme Student Council para sa mga isyu at proyekto ng mga mag-aaral.'
  ],
  'mom.subtitle': [
    'Official records of Student Supreme Council meetings, documenting discussions, decisions, and action items.',
    'Mga opisyal na tala ng pulong ng Supreme Student Council \u2014 ang mga talakayan, desisyon, at aksyon.'
  ],
  'nar.subtitle': [
    'Comprehensive documentation of SSC activities, events, and programs with detailed accounts and outcomes.',
    'Masusing dokumentasyon ng mga aktibidad, gawain, at programa ng SSC kasama ang resulta ng bawat isa.'
  ],
  'acc.subtitle': [
    'Track the progress of SSC initiatives, projects, and achievements for the student body.',
    'Subaybayan ang mga proyekto, hakbangin, at nagawa ng SSC para sa mga mag-aaral.'
  ],
  'req.subtitle': [
    'Download request letter templates for equipment borrowing, venue reservation, financial assistance, and more.',
    'I-download ang mga template ng request letter para sa paghiram ng kagamitan, reserbasyon ng venue, tulong pinansyal, at iba pa.'
  ],
  'off.subtitle': [
    'Get to know the dedicated student leaders who serve and represent the student body with passion and commitment.',
    'Kilalanin ang mga lider-mag-aaral na naglilingkod at kumakatawan sa inyo nang buong puso.'
  ],

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
