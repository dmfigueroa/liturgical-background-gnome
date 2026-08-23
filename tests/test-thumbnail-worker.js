import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {createThumbnail} from '../src/thumbnail.js';
import {assert} from './helpers.js';

const directory = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_tmp_dir(), `liturgical-thumbnail-${GLib.get_monotonic_time()}`]));
directory.make_directory(null);
const source = directory.get_child('source.png');
const destination = directory.get_child('thumbnail.png');
const png = GLib.base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
source.replace_contents(png, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
try {
    createThumbnail(source.get_path(), destination.get_path());
    assert(destination.query_exists(null), 'thumbnail worker did not create a file');
    assert(destination.query_info('standard::size', Gio.FileQueryInfoFlags.NONE, null).get_size() > 0, 'thumbnail file is empty');
    print('thumbnail worker tests passed');
} finally {
    try { destination.delete(null); } catch (_) {}
    try { source.delete(null); } catch (_) {}
    try { directory.delete(null); } catch (_) {}
}
