import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import {parseCalendar} from './calendar-validator.js';

export class CalendarClient {
    constructor({url, session = null, networkMonitor = null} = {}) {
        this.url = url;
        this.session = session ?? new Soup.Session({timeout: 20, user_agent: 'LiturgicalWallpaper/0.1'});
        this.networkMonitor = networkMonitor;
    }
    async fetch(etag = null) {
        if (this.networkMonitor && !this.networkMonitor.network_available) throw new Error('Network is offline');
        const message = Soup.Message.new('GET', this.url);
        if (etag) message.request_headers.append('If-None-Match', etag);
        const bytes = await new Promise((resolve, reject) => this.session.send_and_read_async(
            message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
                try { resolve(session.send_and_read_finish(result)); } catch (error) { reject(error); }
            }));
        if (message.status_code === Soup.Status.NOT_MODIFIED) return {status: 304};
        if (message.status_code !== Soup.Status.OK) throw new Error(`Calendar server returned HTTP ${message.status_code}`);
        return {status: 200, calendar: parseCalendar(new TextDecoder().decode(bytes.get_data())),
            etag: message.response_headers.get_one('ETag')};
    }
}
