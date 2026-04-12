# Implementation Plan: Web-Prototype to React Native (Expo)

This plan outlines the migration of the `web-prototype/` (HTML/CSS/JS) into the existing React Native / Expo Router application. All prototype source files live under `web-prototype/` only—ignore any other HTML at the repo root.

## Phase 1: Foundation & Theming
- [ ] **Theme Definition:** Translate CSS variables from `web-prototype/styles.css` into a React Native theme object (already partially started in `constants/theme.ts`).
- [ ] **Shared Layouts:** Implement the `topnav` and `bottom-nav` as reusable React components in `@/components/layout/`.
- [ ] **Common UI Components:** Create atomic components based on prototype styles:
  - `Button`: Primary, Secondary, Ghost, Green.
  - `Card`: Standard and specialized (PedidoCard, CookCard).
  - `Typography`: Themed text components — extend or align existing `components/themed-text.tsx` with the prototype theme.

## Phase 2: Navigation (Expo Router)
- [ ] **Route Mapping:** Configure the `app/` directory to match the prototype’s screen structure. **Current baseline (implemented):**
  - `app/index.tsx` — short **splash** (branding only), then `router.replace('/(tabs)')` to the main shell.
  - `(tabs)/index.tsx` — **Landing** `index.html` (**s-home**); tab bar is hidden for now.
  - `(tabs)/explore.tsx` — temporary placeholder until `(user)/marketplace` exists (“Ver cozinheiros” target).
  - **Planned routes (not yet added):**
  - `(auth)/login.tsx` (s-login)
  - `(auth)/register.tsx` (s-cadastro)
  - `(tabs)/orders.tsx` (s-pedidos)
  - `(tabs)/profile.tsx` (s-perfil)
  - `(user)/order-recipe.tsx` (s-enviar-receita)
  - `(user)/marketplace.tsx` (s-cozinheiros)
  - `(user)/confirm-order.tsx` (s-confirmar)
  - `(user)/order-status.tsx` (s-status)
  - `(cook)/dashboard.tsx` (s-painel-cook)

*Note:* After authentication exists, **s-home-user** (`home-user.html`) may map to `(tabs)/index.tsx` or another tab home for logged-in clients; the landing may move behind auth or a dedicated marketing route.

## Phase 3: State & Logic Implementation
- [ ] **Authentication State:** Implement a basic auth provider to toggle between "Client" and "Cook" views.
- [ ] **Navigation Logic:** Replace `go(id)` and `nav(id)` with Expo Router's `router.push()` and `router.replace()`.
- [ ] **Data Mocking:** Create mock data objects for Cozinheiros and Pedidos based on `web-prototype/scripts.js` and the relevant `.html` screens in `web-prototype/`.

## Phase 4: UI Migration (Screen by Screen)
- [x] **Splash:** `app/index.tsx` — branded splash, then navigate to `/(tabs)` (see Phase 2).
- [x] **Landing/Home:** `index.html` (**s-home**) ported to **`(tabs)/index.tsx`** (not the root `app/index.tsx`, which is splash-only).
- [ ] **Forms:** Port registration and login forms with validation.
- [ ] **Marketplace:** Implement the search and filter logic from `cozinheiros.html` (replace `(tabs)/explore` placeholder).
- [ ] **Order Flow:** Port the recipe upload/form and confirmation screens.
- [ ] **Cook Panel:** Implement the order management dashboard for cozinheiros.

## Phase 5: Refinement & Validation
- [ ] **Platform Consistency:** Ensure styles look native on both iOS and Android.
- [ ] **Asset Integration:** Replace placeholder emojis/icons with SVGs or Expo Symbols (splash uses emoji logo tile for now).
- [ ] **Final Linting:** Run `npx expo lint` to ensure code quality.

## AI Implementation Guidelines
- **Surgical Translation:** When porting a screen, use the corresponding `.html` file from `web-prototype/` for structure and `web-prototype/scripts.js` for interactivity logic.
- **Style Mapping:** Map HTML classes (e.g., `.btn-primary`) directly to the established React Native theme constants.
- **Functional Components:** Always use functional components with hooks (`useState`, `useEffect`, `useRouter`).
- **TypeScript:** Define interfaces for all data structures (Order, User, Cook).
