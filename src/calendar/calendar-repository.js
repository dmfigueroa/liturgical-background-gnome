import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {APP_ID, REFRESH_INTERVAL_SECONDS} from '../config.js';
import {loadContents, makeDirectory, replaceContents} from '../utils/async.js';
import {validateCalendar} from '../api/calendar-validator.js';

export class CalendarRepository {
    constructor({client = null, dataDir = null, now = () => GLib.DateTime.new_now_utc()} = {}) {
        this.client = client; this.now = now;
        this.directory = Gio.File.new_for_path(dataDir ?? GLib.build_filenamev([GLib.get_user_data_dir(), APP_ID]));
        this.file = this.directory.get_child('calendar-cache.json');
        this.state = {calendar: null, etag: null, lastSuccessfulCheck: null, lastSuccessfulUpdate: null};
    }
    async load() {
        try {
            const envelope = JSON.parse(await loadContents(this.file));
            if (!validateCalendar(envelope.calendar)) throw new Error('Malformed cached calendar');
            this.state = {...this.state, ...envelope};
            console.info('calendar cache loaded');
        } catch (error) {
            if (!error.matches?.(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND)) console.warn(`calendar cache unavailable: ${error.message}`);
        }
        return this.state;
    }
    needsRefresh(now = this.now()) {
        if (!this.state.lastSuccessfulCheck) return true;
        const checked = GLib.DateTime.new_from_iso8601(this.state.lastSuccessfulCheck, null);
        return !checked || now.to_unix() - checked.to_unix() >= REFRESH_INTERVAL_SECONDS;
    }
    refreshDeadline() {
        if (!this.state.lastSuccessfulCheck) return Math.floor(Date.now() / 1000);
        const checked = GLib.DateTime.new_from_iso8601(this.state.lastSuccessfulCheck, null);
        return checked ? checked.to_unix() + REFRESH_INTERVAL_SECONDS : Math.floor(Date.now() / 1000);
    }
    async refresh() {
        if (!this.client) throw new Error('No calendar client configured');
        const result = await this.client.fetch(this.state.etag);
        const checked = this.now().format_iso8601();
        if (result.status === 304) {
            this.state.lastSuccessfulCheck = checked; await this.#save();
            console.info('calendar response unchanged');
            return {changed: false, calendar: this.state.calendar};
        }
        if (result.status !== 200 || !validateCalendar(result.calendar)) throw new Error('Invalid calendar response');
        this.state = {calendar: result.calendar, etag: result.etag ?? null,
            lastSuccessfulCheck: checked, lastSuccessfulUpdate: checked};
        await this.#save(); console.info('calendar refreshed');
        return {changed: true, calendar: this.state.calendar};
    }
    async #save() { await makeDirectory(this.directory); await replaceContents(this.file, `${JSON.stringify(this.state, null, 2)}\n`); }
}
