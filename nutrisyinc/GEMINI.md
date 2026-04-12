# Gemini CLI Project Mandates

This file contains foundational mandates for Gemini CLI in this workspace. These instructions take absolute precedence over general workflows.

## Project Context
- **Framework:** React Native with Expo (Expo Router).
- **Language:** TypeScript.
- **Styling:** React Native StyleSheet (unless otherwise specified).
- **Reference Prototype:** The `web-prototype/` directory contains the modularized MVP (HTML/CSS/JS). Use the individual `.html` files, `styles.css`, and `scripts.js` as the primary reference for features, business logic, and UI/UX design during the React Native implementation.

## Engineering Standards
- **Naming:** Use kebab-case for filenames and PascalCase for React components.
- **Types:** Strictly use TypeScript. Avoid `any`. Prefer interfaces for object shapes.
- **Components:** Functional components with hooks are preferred.
- **Imports:** Use absolute path aliases configured in `tsconfig.json` (e.g., `@/components/...`) over relative paths.

## Development Workflow
- **Validation:** Always run `npx expo lint` (if available) or check for type errors before concluding a task.
- **Testing:** If a testing framework is set up (e.g., Jest), ensure new components have corresponding test files.

## Documentation
- Keep README.md updated with any major architectural changes.
