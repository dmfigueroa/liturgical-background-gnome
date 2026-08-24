export const APP_ID = 'com.dmfigueroa.LiturgicalBackgroundGNOME';
export const APP_NAME = 'Liturgical Wallpaper';
export const VERSION = '0.1.3';
export const CALENDAR_TIMEZONE = 'America/Bogota';
export const REFRESH_INTERVAL_SECONDS = 24 * 60 * 60;
export const SAFETY_INTERVAL_SECONDS = 60 * 60;
export const COLORS = ['green', 'white', 'red', 'violet', 'rose', 'unknown'];

export function calendarUrl(settings) {
    return `${settings.get_string('api-base-url').replace(/\/$/, '')}/v1/today`;
}
