import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {portalRequest} from './request.js';

export class WallpaperPortal {
    constructor(connection = Gio.DBus.session) { this.connection = connection; }
    async setWallpaperFile(file, {target = 'background', showPreview = false} = {}) {
        const stream = await new Promise((resolve, reject) => file.read_async(GLib.PRIORITY_DEFAULT, null,
            (source, result) => { try { resolve(source.read_finish(result)); } catch (error) { reject(error); } }));
        try {
            const fdList = new Gio.UnixFDList();
            const handle = fdList.append(stream.get_fd());
            const handleToken = `wallpaper_${GLib.uuid_string_random().replaceAll('-', '_')}`;
            return await portalRequest(this.connection, {
                interfaceName: 'org.freedesktop.portal.Wallpaper', methodName: 'SetWallpaperFile', fdList,
                parameters: new GLib.Variant('(sha{sv})', ['', handle, {
                    'set-on': new GLib.Variant('s', target),
                    'show-preview': new GLib.Variant('b', showPreview),
                    handle_token: new GLib.Variant('s', handleToken),
                }]), replyType: new GLib.VariantType('(o)'), handleToken,
            });
        } finally { stream.close(null); }
    }
}
