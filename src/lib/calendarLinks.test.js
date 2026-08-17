import {
  buildIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  parseEventTime,
  toCalendarText
} from './calendarLinks';

describe('parseEventTime', () => {
  it('treats a blank time as an all-day event', () => {
    expect(parseEventTime('')).toEqual({ allDay: true, startMinutes: 0, endMinutes: 0 });
  });

  it('parses a 12-hour range', () => {
    expect(parseEventTime('9:00 AM - 5:00 PM')).toEqual({
      allDay: false,
      startMinutes: 9 * 60,
      endMinutes: 17 * 60
    });
  });

  it('gives a single time a one-hour default duration', () => {
    expect(parseEventTime('1:30 PM')).toEqual({
      allDay: false,
      startMinutes: 13 * 60 + 30,
      endMinutes: 14 * 60 + 30
    });
  });

  it('borrows the closing meridiem when only the end has one', () => {
    // "1:00 - 5:00 PM" must not become 01:00 -> 17:00
    expect(parseEventTime('1:00 - 5:00 PM')).toEqual({
      allDay: false,
      startMinutes: 13 * 60,
      endMinutes: 17 * 60
    });
  });

  it('handles 24-hour times and en dashes', () => {
    expect(parseEventTime('13:00 – 15:30')).toEqual({
      allDay: false,
      startMinutes: 13 * 60,
      endMinutes: 15 * 60 + 30
    });
  });

  it('falls back to all-day when there is no clock time at all', () => {
    expect(parseEventTime('Whole day, TBA').allDay).toBe(true);
  });

  it('keeps a plausible AM start when only the end says PM', () => {
    // "9:00 - 5:00 PM" is the working day, not 9 PM to 5 PM.
    expect(parseEventTime('9:00 - 5:00 PM')).toEqual({
      allDay: false,
      startMinutes: 9 * 60,
      endMinutes: 17 * 60
    });
  });

  it('never produces an end at or before the start', () => {
    const { startMinutes, endMinutes } = parseEventTime('11:00 PM - 11:00 PM');
    expect(endMinutes).toBeGreaterThan(startMinutes);
  });
});

describe('googleCalendarUrl', () => {
  it('converts Manila wall-clock times to UTC stamps', () => {
    const url = googleCalendarUrl({
      id: 'e1',
      title: 'General Assembly',
      date: '2026-08-20',
      time: '9:00 AM - 11:00 AM'
    });
    // 09:00 +08:00 is 01:00 UTC the same day.
    expect(url).toContain('dates=20260820T010000Z%2F20260820T030000Z');
    expect(url).toContain('text=General+Assembly');
    expect(url).toContain('ctz=Asia%2FManila');
  });

  it('uses an exclusive end date for all-day events', () => {
    const url = googleCalendarUrl({ id: 'e2', title: 'Foundation Week', date: '2026-08-20', time: '' });
    expect(url).toContain('dates=20260820%2F20260821');
  });

  it('returns an empty string for an unusable date', () => {
    expect(googleCalendarUrl({ title: 'Nope', date: '' })).toBe('');
  });
});

describe('outlookCalendarUrl', () => {
  it('emits an offset ISO time and picks the host by account flavour', () => {
    const office = outlookCalendarUrl({ id: 'e3', title: 'Council Meeting', date: '2026-09-01', time: '2:00 PM' }, 'office');
    expect(office).toContain('https://outlook.office.com/calendar/0/deeplink/compose');
    expect(office).toContain('startdt=2026-09-01T14%3A00%3A00%2B08%3A00');

    const live = outlookCalendarUrl({ id: 'e3', title: 'Council Meeting', date: '2026-09-01', time: '2:00 PM' }, 'live');
    expect(live).toContain('https://outlook.live.com/calendar/0/deeplink/compose');
  });

  it('marks an untimed event as all-day', () => {
    const url = outlookCalendarUrl({ id: 'e4', title: 'Recognition Day', date: '2026-09-01', time: '' });
    expect(url).toContain('allday=true');
  });
});

describe('buildIcs', () => {
  const event = {
    id: 'e5',
    title: 'Leadership Seminar; Day 1',
    date: '2026-10-05',
    time: '8:00 AM - 4:00 PM',
    location: 'PSU-UCC Gymnasium',
    description: '<p>Bring your <strong>ID</strong>.</p>',
    status: 'approved'
  };

  it('produces a well-formed VCALENDAR', () => {
    const ics = buildIcs(event);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261005T000000Z'); // 08:00 +08:00
    expect(ics).toContain('DTEND:20261005T080000Z');
    expect(ics).toContain('UID:ssc-e5@psu-ucc-ssc');
  });

  it('escapes semicolons in text fields', () => {
    expect(buildIcs(event)).toContain('SUMMARY:Leadership Seminar\\; Day 1');
  });

  it('marks approved events confirmed and everything else tentative', () => {
    expect(buildIcs(event)).toContain('STATUS:CONFIRMED');
    expect(buildIcs({ ...event, status: 'pending' })).toContain('STATUS:TENTATIVE');
  });

  it('writes a VALARM only when a reminder was chosen', () => {
    expect(buildIcs(event, { reminderMinutes: 24 * 60 })).toContain('TRIGGER:-P1D');
    expect(buildIcs(event, { reminderMinutes: 60 })).toContain('TRIGGER:-PT1H');
    expect(buildIcs(event, { reminderMinutes: 0 })).not.toContain('BEGIN:VALARM');
  });

  it('folds content lines to 75 octets', () => {
    const long = buildIcs({ ...event, description: 'x'.repeat(400) });
    long.split('\r\n').forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(75);
    });
  });

  it('writes one VEVENT per event when given a list', () => {
    const ics = buildIcs([event, { ...event, id: 'e6' }]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it('uses a stable UID so re-importing updates instead of duplicating', () => {
    expect(buildIcs(event)).toContain('UID:ssc-e5@psu-ucc-ssc');
    expect(buildIcs({ ...event, title: 'Renamed' })).toContain('UID:ssc-e5@psu-ucc-ssc');
  });
});

describe('toCalendarText', () => {
  it('strips markup and keeps block elements on separate lines', () => {
    expect(toCalendarText('<p>First</p><p>Second</p>')).toBe('First\nSecond');
    expect(toCalendarText('<ul><li>One</li><li>Two</li></ul>')).toBe('One\nTwo');
  });

  it('passes plain text through untouched', () => {
    expect(toCalendarText('Just text')).toBe('Just text');
  });
});
