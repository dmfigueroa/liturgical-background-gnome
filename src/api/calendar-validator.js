import {COLORS} from '../config.js';

function isString(value) { return typeof value === 'string'; }
function isNullableString(value) { return value === null || isString(value); }
function isDate(value) { return isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value); }

export function validateDay(day) {
    if (!day || typeof day !== 'object' || !isDate(day.date) || !isString(day.season))
        return false;
    const {celebration, colors, evening} = day;
    return celebration && isNullableString(celebration.rank) &&
        Array.isArray(celebration.names) && celebration.names.every(isString) &&
        colors && COLORS.includes(colors.primary) &&
        Array.isArray(colors.alternatives) && colors.alternatives.every(c => COLORS.includes(c)) &&
        isString(colors.sourceLabel) && evening &&
        typeof evening.transitionsToNextDay === 'boolean' && isNullableString(evening.reason);
}

export function validateCalendar(calendar) {
    if (!calendar || typeof calendar !== 'object' ||
        !isString(calendar.calendar) || !isString(calendar.timezone) ||
        !isString(calendar.fetchedAt) || !isDate(calendar.validFrom) ||
        !isDate(calendar.validThrough) || typeof calendar.stale !== 'boolean' ||
        !Array.isArray(calendar.days) || !calendar.days.every(validateDay))
        return false;
    const dates = calendar.days.map(day => day.date);
    return new Set(dates).size === dates.length &&
        dates.every((date, index) => index === 0 || dates[index - 1] < date);
}

export function parseCalendar(text) {
    let value;
    try { value = JSON.parse(text); } catch { throw new Error('Invalid JSON response'); }
    if (!validateCalendar(value))
        throw new Error('Invalid calendar response');
    return value;
}
