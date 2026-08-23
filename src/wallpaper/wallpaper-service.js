import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {APP_ID} from '../config.js';
import {loadContents, makeDirectory, replaceContents} from '../utils/async.js';
import {selectWallpaper, shouldApply} from './application-state.js';

export class WallpaperService {
    constructor({repository, portal, settings, dataDir = null, now = () => GLib.DateTime.new_now_utc()}) {
        this.repository = repository; this.portal = portal; this.settings = settings; this.now = now;
        this.directory = Gio.File.new_for_path(dataDir ?? GLib.build_filenamev([GLib.get_user_data_dir(), APP_ID]));
        this.stateFile = this.directory.get_child('wallpaper-state.json'); this.lastApplied = null;
    }
    async load() {
        try { this.lastApplied = JSON.parse(await loadContents(this.stateFile)); }
        catch (error) { if (!error.matches?.(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND)) console.warn(`wallpaper state unavailable: ${error.message}`); }
    }
    async apply(day, {force = false, showPreview = false} = {}) {
        if (!day) return {applied: false, reason: 'no-calendar-day'};
        const color = day.colors.primary; const wallpaperPath = selectWallpaper(this.repository, color);
        if (!wallpaperPath) return {applied: false, reason: 'not-configured', color};
        if (!shouldApply(this.lastApplied, color, wallpaperPath, force)) return {applied: false, reason: 'unchanged'};
        await this.portal.setWallpaperFile(Gio.File.new_for_path(wallpaperPath), {
            target: this.settings.get_string('wallpaper-target'), showPreview,
        });
        this.lastApplied = {color, date: day.date, wallpaperPath, appliedAt: this.now().format_iso8601()};
        await makeDirectory(this.directory); await replaceContents(this.stateFile, `${JSON.stringify(this.lastApplied, null, 2)}\n`);
        console.info(`wallpaper applied for ${color}`); return {applied: true, color};
    }
}
