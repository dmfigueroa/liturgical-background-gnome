import GLib from 'gi://GLib';
import {getEffectiveLiturgicalDay} from '../src/calendar/liturgical-state.js';
import {calendar, day, equal} from './helpers.js';

const august = calendar([day('2026-08-22', 'white', true), day('2026-08-23', 'green')]);
function effective(iso, data = august, time = '18:00') { return getEffectiveLiturgicalDay(data, GLib.DateTime.new_from_iso8601(iso, null), time)?.date; }
equal(effective('2026-08-22T17:59:00-05:00'), '2026-08-22');
equal(effective('2026-08-22T18:00:00-05:00'), '2026-08-23');
equal(effective('2026-08-22T18:01:00-05:00'), '2026-08-23');
equal(effective('2026-08-22T23:59:00-05:00'), '2026-08-23');
equal(effective('2026-08-23T00:00:00-05:00'), '2026-08-23');
equal(effective('2026-08-22T18:00:00-05:00', calendar([day('2026-08-22'), day('2026-08-23', 'white')])), '2026-08-22');
equal(effective('2026-08-22T19:29:00-05:00', august, '19:30'), '2026-08-22');
equal(effective('2026-08-22T19:30:00-05:00', august, '19:30'), '2026-08-23');
const boundary = calendar([day('2026-12-31', 'red', true), day('2027-01-01', 'white')]);
equal(effective('2026-12-31T18:00:00-05:00', boundary), '2027-01-01');
const month = calendar([day('2026-08-31', 'violet', true), day('2026-09-01', 'white')]);
equal(effective('2026-08-31T18:00:00-05:00', month), '2026-09-01');
print('liturgical state tests passed');
