import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {APP_ID, COLORS} from '../config.js';
import {copyFile, makeDirectory} from '../utils/async.js';
import {thumbnailFileName} from './thumbnail-cache.js';

export class WallpaperRepository {
    constructor(settings, dataDir = null, thumbnailCommand = null) {
        this.settings = settings;
        this.directory = Gio.File.new_for_path(dataDir ?? GLib.build_filenamev([GLib.get_user_data_dir(), APP_ID, 'wallpapers']));
        this.thumbnailDirectory = this.directory.get_child('thumbnails');
        this.thumbnailCommand = thumbnailCommand;
        this.thumbnailJobs = new Map();
    }
    pathFor(color) { const path = COLORS.includes(color) ? this.settings.get_string(`wallpaper-${color}`) : ''; return path || null; }
    wallpaperFor(color) { return this.pathFor(color); }
    async thumbnailFor(sourcePath) {
        if (!sourcePath) return null;
        const source = Gio.File.new_for_path(sourcePath);
        const info = await queryInfo(source);
        const metadata = {
            size: info.get_size(),
            modified: info.get_attribute_uint64('time::modified'),
            modifiedUsec: info.get_attribute_uint32('time::modified-usec'),
            etag: info.get_attribute_string('etag::value'),
        };
        const destination = this.thumbnailDirectory.get_child(thumbnailFileName(sourcePath, metadata));
        if (await exists(destination)) return destination.get_path();
        const destinationPath = destination.get_path();
        let job = this.thumbnailJobs.get(destinationPath);
        if (!job) {
            job = this.#generateThumbnail(sourcePath, destination);
            this.thumbnailJobs.set(destinationPath, job);
        }
        try { await job; return destinationPath; }
        finally { if (this.thumbnailJobs.get(destinationPath) === job) this.thumbnailJobs.delete(destinationPath); }
    }
    async #generateThumbnail(sourcePath, destination) {
        if (!this.thumbnailCommand) throw new Error('Thumbnail worker command is unavailable');
        await makeDirectory(this.thumbnailDirectory);
        const process = Gio.Subprocess.new([...this.thumbnailCommand, '--thumbnail', sourcePath, destination.get_path()], Gio.SubprocessFlags.NONE);
        await waitCheck(process);
        if (!await exists(destination)) throw new Error('Thumbnail worker produced no file');
    }
    async import(color, source) {
        if (!COLORS.includes(color)) throw new Error(`Unsupported color ${color}`);
        const extension = extensionFor(source.get_basename());
        const destination = this.directory.get_child(`${color}.${extension}`);
        const temporary = this.directory.get_child(`.${color}.${extension}.new`);
        await makeDirectory(this.directory); await copyFile(source, temporary);
        await new Promise((resolve, reject) => temporary.move_async(destination, Gio.FileCopyFlags.OVERWRITE,
            GLib.PRIORITY_DEFAULT, null, null, (file, result) => {
                try { file.move_finish(result); resolve(); } catch (error) { reject(error); }
            }));
        const previous = this.pathFor(color);
        this.settings.set_string(`wallpaper-${color}`, destination.get_path());
        if (previous && previous !== destination.get_path()) {
            const old = Gio.File.new_for_path(previous);
            old.delete_async(GLib.PRIORITY_LOW, null, (_file, result) => { try { old.delete_finish(result); } catch (_) {} });
        }
        return destination.get_path();
    }
}
function queryInfo(file) {
    return new Promise((resolve, reject) => file.query_info_async(
        'standard::size,time::modified,time::modified-usec,etag::value', Gio.FileQueryInfoFlags.NONE,
        GLib.PRIORITY_DEFAULT, null, (source, result) => {
            try { resolve(source.query_info_finish(result)); } catch (error) { reject(error); }
        }));
}
async function exists(file) {
    try { await queryInfo(file); return true; }
    catch (error) {
        if (error.matches(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND)) return false;
        throw error;
    }
}
function waitCheck(process) {
    return new Promise((resolve, reject) => process.wait_check_async(null, (source, result) => {
        try { source.wait_check_finish(result); resolve(); } catch (error) { reject(error); }
    }));
}
function extensionFor(name) {
    const match = /\.(png|jpe?g|webp)$/i.exec(name ?? '');
    if (!match) throw new Error('Choose a PNG, JPEG, or WebP image');
    return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
}
