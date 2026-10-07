/**
 * Card entrance delays.
 *
 * Cards fade in one after another. Left uncapped that is index * delay, so in a
 * list of thirty the last card arrives seconds after the page has settled and
 * the page looks like it is still loading. Stagger the first few, then stop.
 */
export const STAGGER_LIMIT = 8;

export const staggerDelay = (index) => `${Math.min(index, STAGGER_LIMIT) * 0.06}s`;
