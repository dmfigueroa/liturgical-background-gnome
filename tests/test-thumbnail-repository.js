import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {WallpaperRepository} from '../src/wallpaper/wallpaper-repository.js';
import {assert, equal} from './helpers.js';

const directory = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_tmp_dir(), `liturgical-thumbnail-repository-${GLib.get_monotonic_time()}`]));
directory.make_directory(null);
const source = directory.get_child('source.png');
const png = GLib.base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
source.replace_contents(png, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
const launcher = GLib.build_filenamev([GLib.get_current_dir(), 'tests', 'thumbnail-launcher.js']);
const repository = new WallpaperRepository({}, directory.get_path(), ['/usr/bin/gjs', '-m', launcher]);
try {
    const first = await repository.thumbnailFor(source.get_path());
    const second = await repository.thumbnailFor(source.get_path());
    equal(first, second, 'unchanged source should reuse its thumbnail');
    assert(Gio.File.new_for_path(first).query_exists(null), 'cached thumbnail should exist');
    print('thumbnail repository tests passed');
} finally {
    removeTree(directory);
}

function removeTree(file) {
    if (file.query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY) {
        const children = file.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
        let info;
        while ((info = children.next_file(null))) removeTree(file.get_child(info.get_name()));
    }
    file.delete(null);
}
