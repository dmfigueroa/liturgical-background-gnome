# Liturgical Wallpaper for GNOME

A native GTK 4/Libadwaita application that assigns user-selected wallpapers to Colombian liturgical colors and applies the effective color on the GNOME desktop. It uses modern GJS modules, libsoup 3, GSettings, Meson, Flatpak, and XDG Desktop Portals. No artwork is downloaded or bundled.

The development application ID is `com.dmfigueroa.LiturgicalBackgroundGNOME`. Change the centralized ID and all identically named packaging files together before release.

## Architecture

`CalendarClient` fetches `GET /v1/today` with libsoup and ETags, validates its `today` and `tomorrow` entries, and normalizes them into the application's two-day calendar model. `CalendarRepository` atomically persists that model. Pure `liturgical-state` code chooses the effective cached civil day in `America/Bogota`. `WallpaperService` selects an application-managed image, suppresses redundant writes, and delegates only the portal protocol to `WallpaperPortal`. `BackgroundPortal` owns background/autostart permission. The scheduler calculates midnight, First Vespers, and refresh-deadline events, with an hourly suspend/clock-change safety check.

The client deliberately does not parse the CEC Ordo. The service has already normalized precedence and First Vespers into `evening.transitionsToNextDay`; duplicating that theological/calendar logic in the desktop app would create inconsistent answers.

## Development

GNOME Builder can open the repository and use the included Flatpak manifest. From a terminal:

```sh
flatpak-builder --user --install --force-clean build-dir com.dmfigueroa.LiturgicalBackgroundGNOME.json
flatpak run com.dmfigueroa.LiturgicalBackgroundGNOME
```

For an iterative SDK build without installing:

```sh
flatpak build-init .flatpak-build com.dmfigueroa.LiturgicalBackgroundGNOME org.gnome.Sdk org.gnome.Platform 50
flatpak build .flatpak-build meson setup _build --prefix=/app
flatpak build .flatpak-build meson compile -C _build
flatpak build .flatpak-build meson test -C _build --print-errorlogs
```

The calendar source defaults to `https://liturgical-color.dmfigueroa.com/v1/today`. Configure its base URL inside the development sandbox with:

```sh
flatpak run --command=gsettings com.dmfigueroa.LiturgicalBackgroundGNOME \
  set com.dmfigueroa.LiturgicalBackgroundGNOME api-base-url 'https://your-service.example'
```

That command changes the application's own preference, not GNOME desktop settings. A service on the host may need Flatpak's host-loopback address depending on the networking setup.

## Calendar and First Vespers

Validated calendar data and ETag/check metadata live under the app-private XDG data directory. A malformed response never replaces the existing cache. Startup loads the cache, immediately evaluates/applies it, and only then refreshes if the last successful check is at least 24 hours old. HTTP 304 updates check time without replacing the calendar. Offline or invalid responses leave the cache operational.

Dates are interpreted in the calendar's `America/Bogota` timezone. At the configured time (18:00 by default), tomorrow becomes effective only when today's server-supplied `transitionsToNextDay` is true. The client never infers a transition from tomorrow's rank or color.

## Wallpapers and portals

The GTK file chooser is portal-compatible. PNG, JPEG, and WebP selections are copied to the app-private `wallpapers` directory and only that stable internal path is remembered. A missing normal-color image is not silently replaced. The fallback is used only for `unknown`.

Wallpaper changes use `org.freedesktop.portal.Wallpaper.SetWallpaperFile` with an open file descriptor. Automatic calls set `show-preview=false`; Apply Now may show the portal preview. Raw portal signatures and request-response lifecycle handling are confined to `src/portals`.

Automatic mode is opt-in. Enabling its switch calls `org.freedesktop.portal.Background.RequestBackground` with autostart and the command `com.dmfigueroa.LiturgicalBackgroundGNOME --background`. Denial leaves manual refresh and Apply Now available and is surfaced in the UI. Background mode creates no window and holds its `GApplication`; the launcher uses a separate non-unique foreground instance, so closing that window does not stop the enabled background process. Disabling automation releases the hold and requests removal of portal autostart. Desktop environments ultimately control whether background/autostart is granted and whether the optional `both` wallpaper target is supported.

## Flatpak permissions

The manifest grants only network access, Wayland, fallback X11, and DRI graphics. It deliberately has no home/host filesystem access and no unrestricted session or system bus socket. File selection, wallpaper changes, and background permission pass through filtered XDG portals. Fallback X11 and DRI are conventional GTK compatibility/graphics permissions; remove fallback X11 when targeting a Wayland-only deployment.

## Tests

Tests run with GJS, not Node/npm:

```sh
flatpak build build-dir meson test -C /app-build --print-errorlogs
```

When using the iterative layout above, use the `meson test` command shown there. Coverage includes transition boundaries and custom times, month/year boundaries, event scheduling, valid/malformed/unchanged/replaced/offline cache behavior, ETag reuse, wallpaper selection/fallback rules, and redundant-application suppression.
