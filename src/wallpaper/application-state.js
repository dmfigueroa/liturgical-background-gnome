export function shouldApply(lastApplied, color, wallpaperPath, force = false) {
    return force || !lastApplied || lastApplied.color !== color || lastApplied.wallpaperPath !== wallpaperPath;
}
export function selectWallpaper(repository, color) {
    return repository.wallpaperFor(color === 'unknown' ? 'unknown' : color);
}
