# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- New **Contact** content type that generates a `MECARD:` payload (name, phone, email, organization, website), so phones can save a scanned code straight to contacts. Closes the "vCard / MeCard contact type" roadmap item.

## [1.0.1] - 2026-09-06

### Fixed

- Fixed double-encoded UTF-8 text ("mojibake") in `index.html` that rendered as garbled characters (e.g. `â€"`, `Â·`) instead of the intended em dashes, the multiplication sign, and the middle dot. Affected the page `<title>`, meta description, hero copy, the error-correction dropdown labels, the size readout placeholder (`— × —`), and the footer.
