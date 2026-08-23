/* main.js
 *
 * Copyright 2026 David Figueroa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export async function main(argv) {
    const thumbnailIndex = argv.indexOf('--thumbnail');
    if (thumbnailIndex !== -1) {
        const sourcePath = argv[thumbnailIndex + 1];
        const destinationPath = argv[thumbnailIndex + 2];
        if (!sourcePath || !destinationPath) return 2;
        try {
            const {createThumbnail} = await import('./thumbnail.js');
            createThumbnail(sourcePath, destinationPath);
            return 0;
        } catch (error) {
            printerr(`thumbnail generation failed: ${error.message}`);
            return 1;
        }
    }
    const {LiturgicalApplication} = await import('./application.js');
    const background = argv.includes('--background');
    return new LiturgicalApplication(background, [argv[0]]).runAsync(argv.filter(arg => arg !== '--background'));
}
