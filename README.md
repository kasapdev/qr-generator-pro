# QR Generator Pro

Beautiful QR codes for links, WiFi, contact and more — PNG & SVG export.

> A polished, fully-offline QR code studio. Encode URLs, plain text, email, phone, SMS and WiFi credentials, fine-tune colors, error correction and quiet zone, then export crisp high-resolution PNG or infinitely scalable SVG. No accounts, no network calls, no build step.

## Overview

QR Generator Pro is part of the **Web Utility Suite** — a collection of premium, framework-free utilities that run straight from disk. Pick a content type, fill in the fields, and watch a live, color-accurate preview render in real time. The encoder runs entirely in your browser, so the data you encode never leaves your machine.

It is built with plain HTML5, CSS3 and vanilla ES6+ JavaScript. No frameworks, no bundler, no CDNs — just open `index.html`.

## Features

- **Six content types** with smart, type-specific fields:
  - **URL** — auto-prepends `https://` for bare domains.
  - **Text** — encode any free-form text.
  - **Email** — builds a `mailto:` link with optional subject and body.
  - **Phone** — builds a `tel:` link.
  - **SMS** — builds an `sms:` link with an optional pre-filled message.
  - **WiFi** — generates a `WIFI:` payload (WPA/WEP/open, hidden flag) with correct escaping of special characters so phones can join in one tap.
- **Live preview** rendered onto a real `<canvas>` from the module matrix for pixel-crisp, color-accurate results.
- **Design controls** — error-correction level (L / M / Q / H), foreground & background color pickers with synced hex inputs, an adjustable quiet-zone margin, a one-click color swap, and a contrast check that warns when a code may not scan.
- **High-resolution PNG export** rendered offscreen at 1024px.
- **Scalable SVG export** with a single clean vector path that respects your colors and margin.
- **Copy encoded data** to the clipboard in one click.
- **History** of your last 12 codes with thumbnails — click any card to instantly restore its content, colors and settings.
- **Persistent settings** — your last content, colors and options are remembered via `localStorage`.
- **Dark & light themes**, fully responsive down to 360px, accessible, and keyboard-operable.
- **100% offline** — works from `file://`, no network requests.

## Installation

No dependencies and no build step.

```bash
git clone https://github.com/your-org/web-utility-suite.git
cd web-utility-suite/qr-generator
```

Then simply open `index.html` in any modern browser (double-click it, or use a local static server if you prefer).

## Usage

1. Choose a content type from the tabs (URL, Text, Email, Phone, SMS, WiFi).
2. Fill in the fields — the preview updates live as you type.
3. Adjust the **error correction**, **margin**, and **foreground / background colors** to taste. Keep an eye on the contrast badge.
4. Export your code:
   - **PNG** for raster use (chat, slides, print mockups).
   - **SVG** for crisp scaling at any size (print, large displays).
   - **Copy** the raw encoded string for use elsewhere.
5. Press <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> to save the current code to your history. Click any history card to restore it.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> | Generate & save to history |
| <kbd>Ctrl/⌘</kbd> + <kbd>S</kbd> | Download PNG |
| <kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Download SVG |
| <kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> | Copy encoded data |
| <kbd>?</kbd> | Show keyboard shortcuts |

## Screenshots

> _Screenshots coming soon._

![screenshot](docs/screenshot-1.png)
![screenshot](docs/screenshot-2.png)

## Roadmap

- [ ] Logo overlay in the center of the code (with auto error-correction bump)
- [ ] Rounded / dot module styles and gradient fills
- [ ] vCard / MeCard contact type
- [ ] Batch generation from a pasted list or CSV
- [ ] Calendar event (`VEVENT`) and geo-location types

## License

MIT Licensed. Part of the [Web Utility Suite](../index.html).
