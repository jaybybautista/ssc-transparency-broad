import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import fs from 'fs';
import path from 'path';

jest.mock('../context/LanguageContext', () => {
  const { translate } = jest.requireActual('../lib/translations');
  return { useLanguage: () => ({ t: (key) => translate('en', key), language: 'en' }) };
});

// eslint-disable-next-line import/first
import OfficerDirectory from './OfficerDirectory';

const officers = [
  { id: '1', name: 'Roanne Mae DP. Calvo', position: 'BSArchi Representative', division: 'Legislative Department', course: 'BS Architecture' },
  { id: '2', name: 'Renz C. Lomibao', position: 'Deputy House Speaker | BSCE Representative', division: 'Legislative Department' },
  { id: '3', name: 'Allah Marie N. Martos', position: 'Minority Floor Leader | BSIT Representative', division: 'Legislative Department', course: 'BS Information Technology' },
  { id: '4', name: 'Chester A. Agnote', position: 'President', division: 'Core Officers', email: 'president@psu.edu.ph' },
  { id: '5', name: 'Nobody Knows', position: 'Committee Member', division: 'Executive Committe' }
];

let container;
let root;

const render = (props = {}) => {
  act(() =>
    root.render(<OfficerDirectory officers={officers} academicYear="2025-2026" {...props} />)
  );
};

const texts = (selector) =>
  [...container.querySelectorAll(selector)].map((el) => el.textContent.trim());

const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

/*
 * jsdom has no PointerEvent and its elementFromPoint always returns null, so
 * the pointer stream is synthesised and the hit test is stubbed to name the
 * card the finger is meant to be over. What is under test is the reordering
 * the component does with that answer, not the browser's hit testing.
 */
const pointer = (type, target, props = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, button: 0, clientX: 10, clientY: 10, ...props });
  act(() => {
    target.dispatchEvent(event);
  });
};

const cardFor = (name) =>
  [...container.querySelectorAll('.officer-card')].find(
    (card) => card.querySelector('.officer-name').textContent === name
  );

const dragOnto = (fromName, toName) => {
  const handle = cardFor(fromName).querySelector('.officer-drag-handle');
  pointer('pointerdown', handle);
  document.elementFromPoint = () => cardFor(toName);
  pointer('pointermove', handle);
  pointer('pointerup', handle);
};

const type = (value) => {
  const input = container.querySelector('.officer-search input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  window.localStorage.setItem('officersViewMode', 'grid');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('the directory', () => {
  it('sorts a section by seniority when nobody has arranged it', () => {
    // On the live page the Deputy Speaker and the Floor Leader sat scattered
    // among the plain representatives, because officers were the one
    // collection fetched with no ordering at all.
    render();
    const legislative = [...container.querySelectorAll('.officer-section')].find((section) =>
      section.querySelector('.officer-section-title').textContent === 'Legislative Department'
    );
    expect([...legislative.querySelectorAll('.officer-name')].map((el) => el.textContent)).toEqual([
      'Renz C. Lomibao',
      'Allah Marie N. Martos',
      'Roanne Mae DP. Calvo'
    ]);
  });

  it('shows an officer whose division is misspelt rather than dropping them', () => {
    /*
     * "Executive Committe" is not one of the six. Both pages used to render
     * only exact matches, so that officer vanished from the site while the
     * count above the grid still counted them.
     */
    render();
    expect(container.textContent).toContain('Nobody Knows');
    expect(texts('.officer-section-title')).toContain('Other Officers');
    expect(container.querySelectorAll('.officer-card')).toHaveLength(officers.length);
  });

  it('names the term, so an archived year is not silently a different council', () => {
    render();
    expect(container.querySelector('.officer-term').textContent).toBe('A.Y. 2025-2026');
  });

  it('renders nothing at all when there are no officers', () => {
    act(() => root.render(<OfficerDirectory officers={[]} />));
    expect(container.querySelector('.officer-directory')).toBeNull();
  });
});

describe('finding an officer', () => {
  it('is available without being an admin', () => {
    // Search used to be an admin-only tool, leaving students to scroll 49 cards.
    render();
    expect(container.querySelector('.officer-search input')).toBeTruthy();
  });

  it('matches on program as well as name and position', () => {
    render();
    type('BSIT');
    expect(texts('.officer-name')).toEqual(['Allah Marie N. Martos']);
  });

  it('says so when nothing matches', () => {
    render();
    type('zzzz');
    expect(container.querySelector('.officer-empty')).toBeTruthy();
    expect(container.querySelectorAll('.officer-card')).toHaveLength(0);
  });

  it('filters to one section without changing what the chips count', () => {
    render();
    const chip = [...container.querySelectorAll('.officer-division-chip')].find((el) =>
      el.textContent.includes('Core Officers')
    );
    click(chip);
    expect(texts('.officer-section-title')).toEqual(['Core Officers']);
    // The chips still describe the whole directory, or they stop telling you
    // what else is there the moment you use one.
    expect(texts('.officer-division-chip')).toEqual([
      'All 5',
      'Core Officers 1',
      'Legislative Department 3',
      'Other Officers 1'
    ]);
  });
});

describe('admin controls', () => {
  it('shows edit and delete only to an admin', () => {
    render();
    expect(container.querySelectorAll('.admin-edit-btn')).toHaveLength(0);
    render({ isAdmin: true, onEdit: jest.fn(), onDelete: jest.fn() });
    expect(container.querySelectorAll('.admin-edit-btn')).toHaveLength(officers.length);
  });

  it('offers Arrange only when an admin can actually save an order', () => {
    render({ isAdmin: true });
    expect(container.querySelector('.officer-arrange-btn')).toBeNull();
    render({ isAdmin: true, onReorder: jest.fn() });
    expect(container.querySelector('.officer-arrange-btn')).toBeTruthy();
  });

  it('withdraws Arrange while a search is narrowing the list', () => {
    /*
     * Moving somebody "up" inside a set of search results would write an order
     * taken from a list nobody else can see, shuffling the officers that were
     * filtered out.
     */
    render({ isAdmin: true, onReorder: jest.fn() });
    click(container.querySelector('.officer-arrange-btn'));
    expect(container.querySelectorAll('.officer-arrange').length).toBeGreaterThan(0);
    type('BSIT');
    expect(container.querySelector('.officer-arrange-btn')).toBeNull();
    expect(container.querySelectorAll('.officer-arrange')).toHaveLength(0);
  });

  it('numbers the whole section when one officer is moved', () => {
    const onReorder = jest.fn();
    render({ isAdmin: true, onReorder });
    click(container.querySelector('.officer-arrange-btn'));

    // Selected by label rather than by index: each card carries an up and a
    // down button, so counting them is one off-by-one away from testing the
    // opposite of what the name says.
    click(container.querySelector('[aria-label="Move Allah Marie N. Martos up"]'));

    expect(onReorder).toHaveBeenCalledTimes(1);
    /*
     * All three are written, not just the two that swapped. The section had
     * never been arranged, so nobody had a number yet; leaving the third
     * officer unnumbered would sort them ahead of or behind the arranged pair
     * depending on their title, which is not an order anyone chose.
     */
    expect(onReorder.mock.calls[0][0]).toEqual([
      { id: '3', order: 0 },
      { id: '2', order: 1 },
      { id: '1', order: 2 }
    ]);
  });

  it('writes only what changed once a section is already numbered', () => {
    const onReorder = jest.fn();
    const numbered = [
      { id: 'a', name: 'A One', position: 'Member', division: 'Core Officers', order: 0 },
      { id: 'b', name: 'B Two', position: 'Member', division: 'Core Officers', order: 1 },
      { id: 'c', name: 'C Three', position: 'Member', division: 'Core Officers', order: 2 }
    ];
    act(() => root.render(<OfficerDirectory officers={numbered} isAdmin onReorder={onReorder} />));
    click(container.querySelector('.officer-arrange-btn'));
    click(container.querySelector('[aria-label="Move C Three up"]'));

    // Nudging one officer in a section of twenty is two writes, not twenty.
    expect(onReorder.mock.calls[0][0]).toEqual([
      { id: 'c', order: 1 },
      { id: 'b', order: 2 }
    ]);
  });

  it('will not move the first officer up or the last one down', () => {
    const onReorder = jest.fn();
    render({ isAdmin: true, onReorder });
    click(container.querySelector('.officer-arrange-btn'));

    // By label, not by index: each row now carries a drag handle as well as
    // the two arrows, so counting buttons tests the wrong control.
    const firstUp = container.querySelector('[aria-label="Move Renz C. Lomibao up"]');
    const lastDown = container.querySelector('[aria-label="Move Roanne Mae DP. Calvo down"]');
    expect(firstUp.disabled).toBe(true);
    expect(lastDown.disabled).toBe(true);
  });

  it('hides the edit and delete buttons while arranging, so the two do not collide', () => {
    render({ isAdmin: true, onEdit: jest.fn(), onDelete: jest.fn(), onReorder: jest.fn() });
    expect(container.querySelectorAll('.admin-edit-btn').length).toBeGreaterThan(0);
    click(container.querySelector('.officer-arrange-btn'));
    expect(container.querySelectorAll('.admin-edit-btn')).toHaveLength(0);
  });
});

it('writes the arranged admin markup out when asked, for visual checking', () => {
  const out = process.env.OFF_HARNESS_OUT;
  render({ isAdmin: true, onEdit: jest.fn(), onDelete: jest.fn(), onReorder: jest.fn() });
  const normal = container.innerHTML;
  click(container.querySelector('.officer-arrange-btn'));
  if (out) {
    fs.writeFileSync(path.join(out, 'officers-admin.html'), normal, 'utf8');
    fs.writeFileSync(path.join(out, 'officers-arrange.html'), container.innerHTML, 'utf8');
  }
  expect(container.querySelectorAll('.officer-arrange').length).toBe(officers.length);
});

describe('dragging to arrange', () => {
  let originalElementFromPoint;

  beforeEach(() => {
    originalElementFromPoint = document.elementFromPoint;
  });

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
  });

  it('offers a drag handle only while arranging', () => {
    render({ isAdmin: true, onReorder: jest.fn() });
    expect(container.querySelectorAll('.officer-drag-handle')).toHaveLength(0);
    click(container.querySelector('.officer-arrange-btn'));
    expect(container.querySelectorAll('.officer-drag-handle')).toHaveLength(officers.length);
  });

  it('reorders the section when one card is dragged onto another', () => {
    const onReorder = jest.fn();
    render({ isAdmin: true, onReorder });
    click(container.querySelector('.officer-arrange-btn'));

    // Legislative reads Lomibao, Martos, Calvo. Drag Martos onto Calvo.
    dragOnto('Allah Marie N. Martos', 'Roanne Mae DP. Calvo');

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder.mock.calls[0][0]).toEqual([
      { id: '2', order: 0 },
      { id: '1', order: 1 },
      { id: '3', order: 2 }
    ]);
  });

  it('shows the new order under the finger, before it is let go', () => {
    render({ isAdmin: true, onReorder: jest.fn() });
    click(container.querySelector('.officer-arrange-btn'));

    const handle = cardFor('Allah Marie N. Martos').querySelector('.officer-drag-handle');
    pointer('pointerdown', handle);
    document.elementFromPoint = () => cardFor('Roanne Mae DP. Calvo');
    pointer('pointermove', handle);

    const legislative = [...container.querySelectorAll('.officer-section')].find((section) =>
      section.querySelector('.officer-section-title').textContent === 'Legislative Department'
    );
    expect([...legislative.querySelectorAll('.officer-name')].map((el) => el.textContent)).toEqual([
      'Renz C. Lomibao',
      'Roanne Mae DP. Calvo',
      'Allah Marie N. Martos'
    ]);
    pointer('pointerup', handle);
  });

  it('writes nothing when a card is dropped back where it started', () => {
    const onReorder = jest.fn();
    render({ isAdmin: true, onReorder });
    click(container.querySelector('.officer-arrange-btn'));
    dragOnto('Allah Marie N. Martos', 'Allah Marie N. Martos');
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('ignores a card dragged over a different section', () => {
    /*
     * Sections are the council's own structure, not a sort order. Letting a
     * drag cross one would silently move an officer between divisions, which
     * is an edit, not an arrangement.
     */
    const onReorder = jest.fn();
    render({ isAdmin: true, onReorder });
    click(container.querySelector('.officer-arrange-btn'));
    dragOnto('Allah Marie N. Martos', 'Chester A. Agnote');
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('lets go cleanly when the gesture is cancelled', () => {
    const onReorder = jest.fn();
    render({ isAdmin: true, onReorder });
    click(container.querySelector('.officer-arrange-btn'));

    const handle = cardFor('Allah Marie N. Martos').querySelector('.officer-drag-handle');
    pointer('pointerdown', handle);
    document.elementFromPoint = () => cardFor('Roanne Mae DP. Calvo');
    pointer('pointermove', handle);
    pointer('pointercancel', handle);

    // A cancelled drag still commits where the cards were left, rather than
    // stranding the section in a shuffled state that was never saved.
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('.officer-card.is-dragging')).toHaveLength(0);
  });
});
