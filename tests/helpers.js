export function assert(condition, message = 'assertion failed') { if (!condition) throw new Error(message); }
export function equal(actual, expected, message = '') { if (actual !== expected) throw new Error(`${message} expected ${expected}, got ${actual}`); }
export function calendar(days, extra = {}) {
    return {calendar: 'colombia-cec', timezone: 'America/Bogota', fetchedAt: '2026-08-22T08:00:00-05:00',
        validFrom: days[0].date, validThrough: days.at(-1).date, stale: false, days, ...extra};
}
export function day(date, color = 'green', transition = false) {
    return {date, season: 'II TIEMPO ORDINARIO', celebration: {rank: 'Feria', names: []},
        colors: {primary: color, alternatives: [], sourceLabel: color}, evening: {transitionsToNextDay: transition, reason: transition ? 'first-vespers' : null}};
}
