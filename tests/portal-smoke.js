// Developer smoke test: run only inside the installed Flatpak with a desktop session.
import Gio from 'gi://Gio';
import {WallpaperPortal} from '../src/portals/wallpaper-portal.js';

const file = Gio.File.new_for_path('/usr/share/icons/Adwaita/16x16/devices/audio-headphones.png');
await new WallpaperPortal().setWallpaperFile(file, {target: 'background', showPreview: false});
print('wallpaper portal smoke test passed');
