import {parseCalendar, validateCalendar} from '../src/api/calendar-validator.js';
import {assert, day, equal} from './helpers.js';

const today = day('2026-08-23', 'green');
const tomorrow = day('2026-08-24', 'red');
const response = JSON.stringify({date: today.date, today, tomorrow});
const calendar = parseCalendar(response);

equal(calendar.days.length, 2);
equal(calendar.days[0].date, today.date);
equal(calendar.days[1].date, tomorrow.date);
equal(calendar.timezone, 'America/Bogota');
assert(validateCalendar(calendar), 'normalized response was rejected by the repository validator');

let failed = false;
try { parseCalendar(JSON.stringify({date: tomorrow.date, today, tomorrow})); } catch { failed = true; }
assert(failed, 'accepted a response whose date does not match today');
print('calendar validator tests passed');
