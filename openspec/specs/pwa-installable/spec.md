# PWA Installable Specification

## Purpose

Allows users to install the app as a native-like application on their device (Chrome/Android/Desktop) and provides offline caching through Service Worker. The app works without internet connection for previously loaded pages.

## Requirements

### Requirement: Web App Manifest

The system MUST include a valid web app manifest (`public/manifest.json`) that defines the application name, short name, description, icons, start URL, display mode, theme color, and background color.

#### Scenario: Valid manifest exists

- **WHEN** browser requests `/manifest.json`
- **THEN** server returns a valid JSON manifest with required fields: `name`, `short_name`, `description`, `icons` (at least 192x192 and 512x512), `start_url`, `display` set to `standalone`, `theme_color`, `background_color`

#### Scenario: Icons are available in multiple sizes

- **WHEN** user device requests icons for installation prompt
- **THEN** at least two icon files exist: `icon-192.png` (192×192) and `icon-512.png` (512×512) in PNG format under `/public/icons/` directory

#### Scenario: Manifest is linked in HTML

- **WHEN** user opens the application index page
- **THEN** the `<head>` section contains `<link rel="manifest" href="/manifest.json">` meta tag

### Requirement: Service Worker with Offline Cache

The system MUST register a Service Worker that caches static assets (HTML, CSS, JS, fonts, images) and enables offline access to previously visited pages.

#### Scenario: Service Worker registration

- **WHEN** the frontend loads
- **THEN** a Service Worker script (`/sw.js`) is registered via `navigator.serviceWorker.register('/sw.js')` or through Vite plugin automation

#### Scenario: Static asset caching

- **WHEN** first visit occurs or cache needs updating
- **THEN** Service Worker precaches all static assets from Vite build output using cache-first strategy

#### Scenario: Offline access to cached pages

- **WHEN** user opens a previously visited page while offline
- **THEN** the cached version of the page loads successfully without network request

#### Scenario: New version detection

- **WHEN** a new deployment updates the JavaScript/CSS bundles
- **THEN** Service Worker detects the update, invalidates old cache, and serves fresh content on next page reload

### Requirement: Installability

The system MUST be eligible for the browser's "Add to Home Screen" prompt according to Progressive Web App standards.

#### Scenario: Meets installability criteria

- **WHEN** user visits the app on a supported platform (Chrome Android/Desktop, Edge)
- **THEN** the browser shows an install prompt because the app has a valid manifest, Service Worker with fetch handler, and HTTPS (or localhost in dev)

#### Scenario: Install prompt appears after engagement

- **WHEN** user has visited the app twice across multiple sessions
- **THEN** the browser displays the native install banner or CTA (Call To Action) button in the UI

### Requirement: Favicon and Theme Color

The system MUST provide appropriate visual customization for installed app appearance.

#### Scenario: Theme color matches app header

- **WHEN** the app is installed or opened in standalone mode
- **THEN** the browser status bar/address bar uses the theme color defined in manifest (`#3b82f6` or current primary color)

#### Scenario: Icon displayed for home screen shortcut

- **WHEN** user launches the app from home screen desktop
- **THEN** the app icon (`icon-512.png`) is shown without address bar/browser chrome
