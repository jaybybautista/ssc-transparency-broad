import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import fs from 'fs';
import path from 'path';

/*
 * The page pulls from Firestore, auth, dialogs and uploads. All four are
 * replaced here so the test exercises what the page actually decides: which
 * mockRecords show, how they group, and whether an evidence link is offered.
 */
const mockRecords = [
  {
    id: 'a1',
    title: 'Student Emergency Fund launched',
    date: '2026-03-14',
    category: 'Student Welfare',
    status: 'Completed',
    description: '<p>The fund released its first grants this month.</p>',
    linkUrl: 'facebook.com/PSUurdanetaSSC/posts/1',
    linkLabel: '',
    imageUrls: ['https://x.test/a.jpg', 'https://x.test/b.jpg']
  },
  {
    id: 'a2',
    title: 'Library hours extended',
    date: '2026-03-02',
    category: 'Academic',
    status: 'Completed',
    description: '<p>Approved for the examination period.</p>',
    linkUrl: '',
    linkLabel: '',
    imageUrls: []
  },
  {
    id: 'a3',
    title: 'Blood donation drive',
    date: '2026-01-20',
    category: 'Community Service',
    status: 'In Progress',
    description: '<p>Planning with the Red Cross chapter.</p>',
    linkUrl: '',
    imageUrls: []
  },
  // Saved by hand in the Firebase console: no status, no category, no date.
  { id: 'a4', title: 'Orientation week', description: '<p>Held in August.</p>' }
];

const mockData = {
  accomplishments: mockRecords,
  createAccomplishment: jest.fn(),
  updateAccomplishment: jest.fn(),
  deleteAccomplishment: jest.fn(),
  getViewCount: () => 7,
  trackView: jest.fn(),
  hasMore: { accomplishments: false },
  selectedYear: '2025-2026',
  siteProfile: { councilName: 'Supreme Student Council', campusName: 'PSU Urdaneta City Campus' }
};

jest.mock('../context/DataContext', () => ({
  useData: () => mockData,
  PAGE_SIZE: 60
}));

jest.mock('../context/LanguageContext', () => {
  const { translate } = jest.requireActual('../lib/translations');
  return { useLanguage: () => ({ t: (key) => translate('en', key), language: 'en' }) };
});

jest.mock('../App', () => ({ AuthContext: require('react').createContext({ isAdmin: false }) }));
jest.mock('../components/DialogProvider', () => ({
  useDialog: () => ({ confirm: jest.fn(), notify: jest.fn() })
}));
jest.mock('../lib/uploads', () => ({ uploadImages: jest.fn() }));
jest.mock('../components/RichTextEditor', () => () => null);
jest.mock('../components/LoadMore', () => () => null);

// eslint-disable-next-line import/first
import AccomplishmentTracker from './AccomplishmentTracker';

let container;
let root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<AccomplishmentTracker />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const text = (selector) => [...container.querySelectorAll(selector)].map((el) => el.textContent.trim());

describe('the accomplishments list', () => {
  it('renders a record that was saved without a status instead of crashing', () => {
    // The page used to call status.toLowerCase() straight on the record, so a
    // single document with no status took the whole list down.
    expect(container.textContent).toContain('Orientation week');
    expect(container.querySelectorAll('.accomplishment-card')).toHaveLength(4);
  });

  it('groups by month, newest first, and gathers the undated ones', () => {
    expect(text('.acc-month-heading')).toEqual([
      'March 20262',
      'January 20261',
      'No date given1'
    ]);
  });

  it('counts each state on the filter chip itself', () => {
    // One control, not a stats row and a filter bar saying the same thing.
    expect(text('.acc-chip')).toEqual(['All4', 'Planned1', 'Ongoing1', 'Delivered2']);
  });

  it('uses the new wording without touching the stored value', () => {
    expect(container.textContent).toContain('Delivered');
    expect(container.textContent).not.toContain('In Progress');
  });
});

describe('filtering', () => {
  const clickChip = (labelText) => {
    const chip = [...container.querySelectorAll('.acc-chip')].find((el) =>
      el.textContent.startsWith(labelText)
    );
    act(() => chip.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  };

  it('narrows to one state and re-groups what is left', () => {
    clickChip('Ongoing');
    expect(container.querySelectorAll('.accomplishment-card')).toHaveLength(1);
    expect(text('.acc-month-heading')).toEqual(['January 20261']);
  });

  it('keeps the counts showing the whole set, not the filtered view', () => {
    // Otherwise every chip but the active one reads zero and the control stops
    // telling you what else is there.
    clickChip('Ongoing');
    expect(text('.acc-chip')).toEqual(['All4', 'Planned1', 'Ongoing1', 'Delivered2']);
  });

  it('filters by category', () => {
    const select = container.querySelector('.acc-category-select');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    act(() => {
      setter.call(select, 'Academic');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(text('.accomplishment-card h3')).toEqual(['Library hours extended']);
  });
});

describe('evidence', () => {
  it('flags photos and a link on the card, and only when they exist', () => {
    const cards = [...container.querySelectorAll('.accomplishment-card')];
    expect(cards[0].querySelectorAll('.evidence-chip')).toHaveLength(2);
    expect(cards[0].textContent).toContain('2 photos');
    expect(cards[1].querySelectorAll('.evidence-chip')).toHaveLength(0);
  });

  it('offers no link at all when the council did not give one', () => {
    /*
     * The bug this replaces: every Completed record showed a "View Facebook
     * Post" button hardcoded to the council's page feed, so twelve different
     * accomplishments all led to the same place and cited nothing.
     */
    const card = [...container.querySelectorAll('.accomplishment-card')][1];
    act(() => {
      card
        .querySelector('.accomplishment-card-content')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('.modal-content')).toBeTruthy();
    expect(container.querySelector('.acc-evidence-btn')).toBeNull();
  });

  it('links to the record itself, with the scheme added to a bare domain', () => {
    const card = [...container.querySelectorAll('.accomplishment-card')][0];
    act(() => {
      card
        .querySelector('.accomplishment-card-content')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const link = container.querySelector('.acc-evidence-btn');
    expect(link.getAttribute('href')).toBe('https://facebook.com/PSUurdanetaSSC/posts/1');
    expect(link.textContent).toContain('View the Facebook post');
  });
});

describe('the markup harness', () => {
  it('writes the markup out when asked, for visual checking', () => {
    const out = process.env.ACC_HARNESS_OUT;
    if (out) fs.writeFileSync(path.join(out, 'accomplishments.html'), container.innerHTML, 'utf8');
    expect(container.innerHTML).toContain('acc-toolbar');
  });
});
