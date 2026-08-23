import {selectWallpaper, shouldApply} from '../src/wallpaper/application-state.js';
import {assert, equal} from './helpers.js';
const configured = {green: '/green.png', white: '/white.jpg', unknown: '/fallback.webp'};
const repository = {wallpaperFor: color => configured[color] ?? null};
equal(selectWallpaper(repository, 'green'), '/green.png'); equal(selectWallpaper(repository, 'white'), '/white.jpg');
equal(selectWallpaper(repository, 'unknown'), '/fallback.webp'); equal(selectWallpaper(repository, 'red'), null);
assert(shouldApply(null, 'green', '/green.png')); assert(!shouldApply({color: 'green', wallpaperPath: '/green.png'}, 'green', '/green.png'));
assert(shouldApply({color: 'green', wallpaperPath: '/green.png'}, 'green', '/new.png'));
print('wallpaper state tests passed');
