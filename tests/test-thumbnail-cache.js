import {thumbnailFileName} from '../src/wallpaper/thumbnail-cache.js';
import {assert, equal} from './helpers.js';

const source = '/wallpapers/green.jpg';
const original = {size: 100, modified: 10, modifiedUsec: 20, etag: '10:20:100'};
equal(thumbnailFileName(source, original), thumbnailFileName(source, original));
assert(thumbnailFileName(source, original) !== thumbnailFileName(source, {...original, size: 101}));
assert(thumbnailFileName(source, original) !== thumbnailFileName(source, {...original, etag: '11:20:100'}));
print('thumbnail cache tests passed');
