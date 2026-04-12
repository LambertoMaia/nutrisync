# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where versioning applies.

## How to update

- Add new items under **`[Unreleased]`** as you ship work (use **Added** / **Changed** / **Fixed** / **Removed** as fits).
- When you cut a release, rename `[Unreleased]` to a version and date (e.g. `## [0.1.0] - 2026-04-12`), then add a fresh empty `[Unreleased]` section above it.

## [Unreleased]

### Added

- This changelog.

### Changed

- `IMPLEMENTATION_PLAN.md`: prototype migration scope is explicitly limited to `web-prototype/`; mock-data and translation steps reference `web-prototype/scripts.js` and HTML under `web-prototype/` only (no root-level HTML).
