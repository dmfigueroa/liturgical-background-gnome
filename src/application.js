import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {APP_ID, APP_NAME, CALENDAR_TIMEZONE, SAFETY_INTERVAL_SECONDS, VERSION, calendarUrl} from './config.js';
import {CalendarClient} from './api/calendar-client.js';
import {CalendarRepository} from './calendar/calendar-repository.js';
import {getEffectiveLiturgicalDay} from './calendar/liturgical-state.js';
import {nextScheduledEvent} from './calendar/scheduler.js';
import {WallpaperRepository} from './wallpaper/wallpaper-repository.js';
import {WallpaperService} from './wallpaper/wallpaper-service.js';
import {WallpaperPortal} from './portals/wallpaper-portal.js';
import {BackgroundPortal} from './portals/background-portal.js';
import {MainWindow} from './window.js';

export const LiturgicalApplication = GObject.registerClass(class LiturgicalApplication extends Adw.Application {
    constructor(backgroundMode = false, thumbnailCommand = null) { super({application_id: APP_ID, flags: Gio.ApplicationFlags.NON_UNIQUE}); this.backgroundMode = backgroundMode; this.thumbnailCommand = thumbnailCommand; this.timer = 0; this.held = false; }
    vfunc_startup() {
        super.vfunc_startup(); this.settings = new Gio.Settings({schema_id: APP_ID}); this.networkMonitor = Gio.NetworkMonitor.get_default();
        this.calendarRepository = new CalendarRepository({client: new CalendarClient({url: calendarUrl(this.settings), networkMonitor: this.networkMonitor})});
        this.wallpaperRepository = new WallpaperRepository(this.settings, null, this.thumbnailCommand);
        this.wallpaperService = new WallpaperService({repository: this.wallpaperRepository, portal: new WallpaperPortal(), settings: this.settings});
        this.backgroundPortal = new BackgroundPortal(APP_ID); this.#installActions();
        this.#updateHold();
        this.settings.connect('changed::automatic-enabled', () => this.#automaticChanged());
        this.settings.connect('changed::vespers-time', () => { this.evaluateAndApply(); this.schedule(); });
        this.settings.connect('changed::api-base-url', () => this.calendarRepository.client.url = calendarUrl(this.settings));
        this.networkMonitor.connect('network-changed', (_m, available) => { if (available && this.calendarRepository.needsRefresh()) this.refresh(); });
        this.ready = this.#initialize();
    }
    async #initialize() {
        await Promise.all([this.calendarRepository.load(), this.wallpaperService.load()]);
        await this.evaluateAndApply(); if (this.calendarRepository.needsRefresh()) await this.refresh();
        this.schedule(); this.#updateHold(); this.window?.updateState();
    }
    vfunc_activate() {
        if (this.backgroundMode) { this.#updateHold(); return; }
        if (!this.window) this.window = new MainWindow(this);
        this.window.present();
        // Render persisted settings immediately; network refresh and portal requests may wait for user interaction.
        this.window.updateState();
        this.ready?.then(() => this.window?.updateState());
    }
    async evaluateAndApply({force = false, showPreview = false} = {}) {
        const calendar = this.calendarRepository.state.calendar;
        this.effectiveDay = getEffectiveLiturgicalDay(calendar, GLib.DateTime.new_now_utc(), this.settings.get_string('vespers-time'));
        if (this.effectiveDay && (this.settings.get_boolean('automatic-enabled') || force)) {
            try { this.lastApplyResult = await this.wallpaperService.apply(this.effectiveDay, {force, showPreview}); }
            catch (error) { console.warn(`wallpaper portal failed: ${error.message}`); this.lastError = 'Wallpaper portal denied or unavailable'; }
        }
        this.window?.updateState(); return this.effectiveDay;
    }
    async refresh() {
        if (this.refreshing) return;
        this.refreshing = true;
        this.lastError = null; this.window?.setBusy(true);
        try { await this.calendarRepository.refresh(); await this.evaluateAndApply(); }
        catch (error) { console.warn(`calendar refresh failed: ${error.message}`); this.lastError = error.message; }
        finally { this.refreshing = false; this.window?.setBusy(false); this.window?.updateState(); this.schedule(); }
    }
    schedule() {
        if (this.timer) { GLib.source_remove(this.timer); this.timer = 0; }
        if (!this.settings.get_boolean('automatic-enabled')) return;
        const now = GLib.DateTime.new_now_utc();
        const event = nextScheduledEvent(now, this.calendarRepository.state.calendar?.timezone ?? CALENDAR_TIMEZONE,
            this.settings.get_string('vespers-time'), this.calendarRepository.refreshDeadline());
        const seconds = Math.max(1, Math.min(event.at - now.to_unix(), SAFETY_INTERVAL_SECONDS));
        this.timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
            this.timer = 0; this.evaluateAndApply();
            if (this.calendarRepository.needsRefresh()) this.refresh(); else this.schedule(); return GLib.SOURCE_REMOVE;
        });
    }
    async enableAutomatic() {
        try { await this.backgroundPortal.request(); this.settings.set_boolean('background-permission-denied', false);
            this.settings.set_boolean('automatic-enabled', true); console.info('background permission granted'); return true;
        } catch (error) { console.warn(`background permission denied: ${error.message}`); this.settings.set_boolean('background-permission-denied', true);
            this.settings.set_boolean('automatic-enabled', false); this.window?.updateState(); return false; }
    }
    disableAutomatic() {
        this.settings.set_boolean('automatic-enabled', false);
        this.backgroundPortal.request(false).catch(error => console.warn(`could not disable portal autostart: ${error.message}`));
    }
    #automaticChanged() { this.#updateHold(); this.schedule(); if (this.settings.get_boolean('automatic-enabled')) this.evaluateAndApply(); }
    #updateHold() { const enabled = this.settings.get_boolean('automatic-enabled'); if (enabled && !this.held) { this.hold(); this.held = true; }
        else if (!enabled && this.held) { this.release(); this.held = false; } }
    #installActions() {
        for (const [name, callback] of [['quit', () => this.quit()], ['about', () => this.showAbout()]]) {
            const action = new Gio.SimpleAction({name}); action.connect('activate', callback); this.add_action(action); }
        this.set_accels_for_action('app.quit', ['<Control>q']);
    }
    showAbout() { new Adw.AboutDialog({application_name: APP_NAME, application_icon: APP_ID, version: VERSION,
        developer_name: 'David Figueroa', website: 'https://example.invalid/liturgical-wallpaper',
        license: 'GNU General Public License v3.0 or later',
        comments: 'Changes the desktop wallpaper according to the Colombian liturgical calendar.'}).present(this.active_window); }
});
