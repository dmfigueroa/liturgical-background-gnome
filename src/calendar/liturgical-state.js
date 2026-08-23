import GLib from 'gi://GLib';

export function parseVespersTime(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) throw new Error('Invalid First Vespers time');
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new Error('Invalid First Vespers time');
    return {hour, minute};
}

export function dateTimeInZone(now, timezone) {
    return now.to_timezone(GLib.TimeZone.new_identifier(timezone));
}

export function civilDate(now, timezone) {
    return dateTimeInZone(now, timezone).format('%Y-%m-%d');
}

export function isAtOrAfter(now, timezone, vespersTime) {
    const local = dateTimeInZone(now, timezone);
    const {hour, minute} = parseVespersTime(vespersTime);
    return local.get_hour() > hour ||
        (local.get_hour() === hour && local.get_minute() >= minute);
}

export function nextCivilDate(now, timezone) {
    return dateTimeInZone(now, timezone).add_days(1).format('%Y-%m-%d');
}

export function getEffectiveLiturgicalDay(calendar, now, vespersTime = '18:00') {
    if (!calendar) return null;
    const today = calendar.days.find(day => day.date === civilDate(now, calendar.timezone));
    if (!today) return null;
    if (today.evening.transitionsToNextDay && isAtOrAfter(now, calendar.timezone, vespersTime))
        return calendar.days.find(day => day.date === nextCivilDate(now, calendar.timezone)) ?? today;
    return today;
}

export function isFirstVespers(calendar, effectiveDay, now, vespersTime) {
    return effectiveDay !== null && effectiveDay.date !== civilDate(now, calendar.timezone);
}
