export function loadContents(file) {
    return new Promise((resolve, reject) => file.load_contents_async(null, (source, result) => {
        try {
            const [, contents] = source.load_contents_finish(result);
            resolve(new TextDecoder().decode(contents));
        } catch (error) { reject(error); }
    }));
}

export function replaceContents(file, text) {
    return new Promise((resolve, reject) => file.replace_contents_async(
        new TextEncoder().encode(text), null, false,
        Gio.FileCreateFlags.REPLACE_DESTINATION, null, (source, result) => {
            try { source.replace_contents_finish(result); resolve(); }
            catch (error) { reject(error); }
        }));
}

export function makeDirectory(file) {
    return new Promise((resolve, reject) => file.make_directory_async(GLib.PRIORITY_DEFAULT, null, async (source, result) => {
        try { source.make_directory_finish(result); resolve(); }
        catch (error) {
            if (error.matches(Gio.io_error_quark(), Gio.IOErrorEnum.EXISTS)) resolve();
            else if (error.matches(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND)) {
                try { await makeDirectory(file.get_parent()); await makeDirectory(file); resolve(); } catch (parentError) { reject(parentError); }
            } else reject(error);
        }
    }));
}

export function copyFile(source, destination, flags = Gio.FileCopyFlags.OVERWRITE) {
    return new Promise((resolve, reject) => source.copy_async(destination, flags,
        GLib.PRIORITY_DEFAULT, null, null, (file, result) => {
            try { file.copy_finish(result); resolve(); } catch (error) { reject(error); }
        }));
}
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
