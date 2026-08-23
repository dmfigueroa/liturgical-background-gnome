import GLib from 'gi://GLib';

export function thumbnailFileName(sourcePath, {size, modified, modifiedUsec, etag}) {
    const fingerprint = [sourcePath, size, modified, modifiedUsec, etag ?? ''].join('|');
    const digest = GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, fingerprint, -1);
    return `${digest.slice(0, 24)}.png`;
}
