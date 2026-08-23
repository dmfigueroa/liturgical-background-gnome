import Adw from 'gi://Adw?version=1';
import Gdk from 'gi://Gdk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk?version=4.0';
import {COLORS} from './config.js';
import {civilDate} from './calendar/liturgical-state.js';

const LABELS = {green: 'Green', white: 'White', red: 'Red', violet: 'Violet', rose: 'Rose', unknown: 'Fallback'};
const THUMBNAIL_CSS = `.wallpaper-thumbnail {
    border-radius: 8px;
    margin-top: 6px;
    margin-bottom: 6px;
}`;
export const MainWindow = GObject.registerClass(class MainWindow extends Adw.ApplicationWindow {
    constructor(application) { super({application, title: 'Liturgical Wallpaper', default_width: 620, default_height: 760}); this.app = application; this.rows = new Map(); this.#build(); this.#installActions(); }
    #build() {
        const css = new Gtk.CssProvider(); css.load_from_data(THUMBNAIL_CSS, -1);
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        const toolbar = new Adw.ToolbarView(); const header = new Adw.HeaderBar();
        const menu = new Gio.Menu(); menu.append('About Liturgical Wallpaper', 'app.about'); menu.append('Quit', 'app.quit');
        header.pack_end(new Gtk.MenuButton({icon_name: 'open-menu-symbolic', menu_model: menu, primary: true})); toolbar.add_top_bar(header);
        this.banner = new Adw.Banner({revealed: false}); toolbar.add_top_bar(this.banner);
        const page = new Adw.PreferencesPage(); this.stateGroup = new Adw.PreferencesGroup({title: 'Today'});
        this.stateRow = new Adw.ActionRow({title: 'No calendar data yet', subtitle: 'Refresh the calendar to get started'});
        this.stateRow.add_suffix(new Gtk.Button({label: 'Apply Now', action_name: 'win.apply-now', valign: Gtk.Align.CENTER})); this.stateGroup.add(this.stateRow); page.add(this.stateGroup);
        const wallpapers = new Adw.PreferencesGroup({title: 'Wallpapers', description: 'Images are copied into private application storage.'});
        for (const color of COLORS) {
            const row = new Adw.ActionRow({title: LABELS[color], subtitle: 'Not configured', activatable: true});
            const picture = new Gtk.Picture({width_request: 64, height_request: 42, content_fit: Gtk.ContentFit.COVER, overflow: Gtk.Overflow.HIDDEN}); picture.add_css_class('wallpaper-thumbnail');
            row.add_prefix(picture); row.add_suffix(new Gtk.Image({icon_name: 'document-open-symbolic'})); row.connect('activated', () => this.chooseWallpaper(color));
            wallpapers.add(row); this.rows.set(color, {row, picture});
        }
        page.add(wallpapers); const automation = new Adw.PreferencesGroup({title: 'Automation'});
        this.automatic = new Adw.SwitchRow({title: 'Automatic Wallpaper', subtitle: 'Run in the background and start at login'});
        this.automatic.connect('notify::active', () => { if (!this.updating) { if (this.automatic.active) this.app.enableAutomatic(); else this.app.disableAutomatic(); } }); automation.add(this.automatic);
        this.vespers = new Adw.EntryRow({title: 'First Vespers time', show_apply_button: true}); this.vespers.text = this.app.settings.get_string('vespers-time');
        this.vespers.connect('apply', () => { if (/^([01]\d|2[0-3]):[0-5]\d$/.test(this.vespers.text)) this.app.settings.set_string('vespers-time', this.vespers.text); }); automation.add(this.vespers);
        this.target = new Adw.ComboRow({title: 'Apply wallpaper to', model: Gtk.StringList.new(['Desktop', 'Desktop and Lock Screen'])});
        this.target.selected = this.app.settings.get_string('wallpaper-target') === 'both' ? 1 : 0;
        this.target.connect('notify::selected', () => this.app.settings.set_string('wallpaper-target', this.target.selected === 1 ? 'both' : 'background')); automation.add(this.target); page.add(automation);
        const calendar = new Adw.PreferencesGroup({title: 'Calendar', description: 'Colombian Ordo'});
        this.checkedRow = new Adw.ActionRow({title: 'Last checked', subtitle: 'Never'}); calendar.add(this.checkedRow);
        this.validRow = new Adw.ActionRow({title: 'Available through', subtitle: 'No cached calendar'});
        this.validRow.add_suffix(new Gtk.Button({label: 'Refresh Now', action_name: 'win.refresh', valign: Gtk.Align.CENTER})); calendar.add(this.validRow); page.add(calendar);
        toolbar.content = new Gtk.ScrolledWindow({child: page}); this.content = toolbar;
    }
    #installActions() {
        const refresh = new Gio.SimpleAction({name: 'refresh'}); refresh.connect('activate', () => this.app.refresh()); this.add_action(refresh);
        const apply = new Gio.SimpleAction({name: 'apply-now'}); apply.connect('activate', () => this.app.evaluateAndApply({force: true, showPreview: true})); this.add_action(apply);
        this.app.set_accels_for_action('win.refresh', ['<Control>r']);
    }
    setBusy(busy) { if (busy) this.stateRow.subtitle = 'Refreshing calendar…'; }
    updateState() {
        const state = this.app.calendarRepository.state; const day = this.app.effectiveDay;
        this.updating = true; this.automatic.active = this.app.settings.get_boolean('automatic-enabled'); this.updating = false;
        if (day) { const name = day.celebration.names[0] || day.season; const rank = day.celebration.rank ?? 'Sunday'; const firstVespers = day.date !== civilDate(GLib.DateTime.new_now_utc(), state.calendar.timezone);
            this.stateRow.title = name; this.stateRow.subtitle = `${LABELS[day.colors.primary] ?? 'Unknown'} · ${rank}${firstVespers ? ' · First Vespers' : ''}`;
        } else { this.stateRow.title = 'No calendar data for today'; this.stateRow.subtitle = 'The current wallpaper has been left unchanged'; }
        this.checkedRow.subtitle = state.lastSuccessfulCheck ? formatDateTime(state.lastSuccessfulCheck) : 'Never'; this.validRow.subtitle = state.calendar?.validThrough ?? 'No cached calendar';
        for (const [color, widgets] of this.rows) {
            const path = this.app.wallpaperRepository.pathFor(color);
            widgets.row.subtitle = path ? Gio.File.new_for_path(path).get_basename() : 'Not configured';
            this.#loadThumbnail(widgets.picture, path);
        }
        const problem = this.app.lastError || (state.calendar?.stale ? 'The server reports that calendar data is stale.' : null) ||
            (this.app.settings.get_boolean('background-permission-denied') ? 'Background permission was denied. Manual mode remains available.' : null);
        this.banner.title = problem ?? ''; this.banner.revealed = Boolean(problem);
    }
    chooseWallpaper(color) {
        const dialog = new Gtk.FileDialog({title: `Choose ${LABELS[color]} wallpaper`, modal: true}); const filter = new Gtk.FileFilter(); filter.name = 'Images';
        for (const mime of ['image/png', 'image/jpeg', 'image/webp']) filter.add_mime_type(mime);
        const filters = new Gio.ListStore({item_type: Gtk.FileFilter}); filters.append(filter); dialog.filters = filters; dialog.default_filter = filter;
        dialog.open(this, null, async (source, result) => {
            try { const file = source.open_finish(result); await this.app.wallpaperRepository.import(color, file); this.updateState(); await this.app.evaluateAndApply(); }
            catch (error) { if (!error.matches?.(Gio.io_error_quark(), Gio.IOErrorEnum.CANCELLED)) { this.app.lastError = error.message; this.updateState(); } }
        });
    }
    #loadThumbnail(picture, path) {
        const requestId = (picture.thumbnailRequestId ?? 0) + 1;
        picture.thumbnailRequestId = requestId;
        if (picture.thumbnailSourcePath !== path) {
            picture.thumbnailSourcePath = path;
            picture.thumbnailPath = null;
            picture.file = null;
        }
        if (!path) return;
        this.app.wallpaperRepository.thumbnailFor(path).then(thumbnailPath => {
            if (picture.thumbnailRequestId !== requestId || picture.thumbnailPath === thumbnailPath) return;
            picture.thumbnailPath = thumbnailPath;
            picture.file = Gio.File.new_for_path(thumbnailPath);
        }).catch(error => {
            if (picture.thumbnailRequestId === requestId) console.warn(`thumbnail unavailable for ${path}: ${error.message}`);
        });
    }
});
function formatDateTime(value) { const date = GLib.DateTime.new_from_iso8601(value, null); return date ? date.to_local().format('%c') : value; }
