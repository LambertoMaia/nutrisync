# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where versioning applies.

## How to update

- Add new items under **`[Unreleased]`** as you ship work (use **Added** / **Changed** / **Fixed** / **Removed** as fits).
- When you cut a release, rename `[Unreleased]` to a version and date (e.g. `## [0.1.0] - 2026-04-12`), then add a fresh empty `[Unreleased]` section above it.

## [Unreleased]

### Added

- This changelog.
- **`app/index.tsx`:** Splash route with NutriSync logo tile, name, and tagline (`sua receita, nossa marmita`); after ~2.5s navigates with `router.replace('/(tabs)')` to the main app (landing at `(tabs)/index.tsx`). Native splash is released via `expo-splash-screen` once the screen mounts.
- **`app/_layout.tsx`:** Root stack (`index`, `(tabs)`), theme provider, `SplashScreen.preventAutoHideAsync()` at startup, status bar.
- **`app/(tabs)/_layout.tsx`:** Tab navigator with the tab bar hidden (`tabBarStyle: { display: 'none' }`).
- **`app/(tabs)/explore.tsx`:** Minimal placeholder for the Explore route (used from “Ver cozinheiros” until the marketplace screen exists).

### Changed

- **`IMPLEMENTATION_PLAN.md`:** Prototype migration scope is limited to `web-prototype/`; mock-data and translation steps reference `web-prototype/scripts.js` and HTML under `web-prototype/` only. Route mapping updated for splash vs landing (see plan).
- **`app/(tabs)/index.tsx`:** Replaced the default Expo welcome UI with the NutriSync landing from `web-prototype/index.html` (palette, hero, steps, CTA band). Secondary button label centered via flex + `textAlign` on the text.
- **Navigation:** Initial experience is splash → `(tabs)` landing. The previous `unstable_settings.anchor: '(tabs)'` behavior is not used so the app can start on `/` (splash).

### Fixed

- **Secondary CTA:** `textAlign` on `Pressable` does not center inner text; alignment is handled on the button (`alignItems` / `justifyContent`) and on `Text` (`textAlign: 'center'`).
