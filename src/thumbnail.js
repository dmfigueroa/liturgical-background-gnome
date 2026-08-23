import Gio from 'gi://Gio';
import Gst from 'gi://Gst?version=1.0';

export function createThumbnail(sourcePath, destinationPath) {
    Gst.init(null);
    const temporaryPath = `${destinationPath}.new`;
    const source = Gio.File.new_for_path(sourcePath);
    const temporary = Gio.File.new_for_path(temporaryPath);
    const destination = Gio.File.new_for_path(destinationPath);
    const pipeline = Gst.parse_launch('filesrc name=source ! decodebin ! videoconvert ! videoscale ! video/x-raw,format=RGBA,width=96,height=64,pixel-aspect-ratio=1/1 ! pngenc ! appsink name=sink sync=false max-buffers=1 drop=true');
    pipeline.get_by_name('source').location = source.get_path();
    const sink = pipeline.get_by_name('sink');
    try {
        const state = pipeline.set_state(Gst.State.PLAYING);
        if (state === Gst.StateChangeReturn.FAILURE) throw new Error('Could not start thumbnail pipeline');
        const sample = sink.emit('pull-sample');
        if (!sample) throw new Error('Thumbnail pipeline returned no image');
        const buffer = sample.get_buffer();
        const [mapped, map] = buffer.map(Gst.MapFlags.READ);
        if (!mapped) throw new Error('Could not read encoded thumbnail');
        try { temporary.replace_contents(map.data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null); }
        finally { buffer.unmap(map); }
        temporary.move(destination, Gio.FileCopyFlags.OVERWRITE, null, null);
    } finally {
        pipeline.set_state(Gst.State.NULL);
        try { if (temporary.query_exists(null)) temporary.delete(null); } catch (_) {}
    }
}
