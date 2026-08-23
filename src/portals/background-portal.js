import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {portalRequest} from './request.js';

export class BackgroundPortal {
    constructor(appId, connection = Gio.DBus.session) { this.appId = appId; this.connection = connection; }
    async request(enable = true) {
        const handleToken = `background_${GLib.uuid_string_random().replaceAll('-', '_')}`;
        const results = await portalRequest(this.connection, {
            interfaceName: 'org.freedesktop.portal.Background', methodName: 'RequestBackground',
            parameters: new GLib.Variant('(sa{sv})', ['', {
                reason: new GLib.Variant('s', enable ? 'Change the wallpaper for the current liturgical day' : ''),
                autostart: new GLib.Variant('b', enable),
                commandline: new GLib.Variant('as', [this.appId, '--background']),
                'dbus-activatable': new GLib.Variant('b', false),
                handle_token: new GLib.Variant('s', handleToken),
            }]), replyType: new GLib.VariantType('(o)'), handleToken,
        });
        const background = results.background?.deepUnpack?.() ?? results.background ?? false;
        const autostart = results.autostart?.deepUnpack?.() ?? results.autostart ?? false;
        if (enable && (!background || !autostart)) throw new Error('Background or autostart permission was not granted');
        return {background, autostart};
    }
}
