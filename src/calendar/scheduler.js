import GLib from 'gi://GLib';
import {dateTimeInZone, parseVespersTime} from './liturgical-state.js';

export function nextScheduledEvent(now, timezone, vespersTime, refreshDeadline = null) {
    const local = dateTimeInZone(now, timezone);
    const midnight = GLib.DateTime.new(timezoneObject(timezone), local.get_year(), local.get_month(),
        local.get_day_of_month(), 0, 0, 0).add_days(1);
    const parsed = parseVespersTime(vespersTime);
    let vespers = GLib.DateTime.new(timezoneObject(timezone), local.get_year(), local.get_month(),
        local.get_day_of_month(), parsed.hour, parsed.minute, 0);
    if (vespers.compare(local) <= 0) vespers = vespers.add_days(1);
    const candidates = [
        {kind: 'midnight', at: midnight.to_unix()},
        {kind: 'vespers', at: vespers.to_unix()},
    ];
    if (refreshDeadline !== null) candidates.push({kind: 'refresh', at: refreshDeadline});
    return candidates.reduce((a, b) => a.at <= b.at ? a : b);
}

function timezoneObject(identifier) {
    return GLib.TimeZone.new_identifier(identifier);
}
