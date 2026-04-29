## Context

The Director's Lounge is a SvelteKit movie night coordination app using Firebase (Firestore, Anonymous Auth), Svelte 5 runes, and Genkit with Google Gemini. The app currently has no admin authentication system—all users are anonymous. The codebase has some naming convention inconsistencies (viewmodels lack `.svelte.ts` suffix, type imports should use `$types` alias).

Current stack: SvelteKit + Svelte 5, Firebase (client + admin SDK), Tailwind CSS 4, Genkit/Gemini, TMDB API, Playwright (configured but minimal tests).

## Goals / Non-Goals

**Goals:**
- Implement secure admin authentication with Firebase email/password auth
- Enable session naming and shareable guest links
- Add avatar support with dicebear default avatars
- Replace/unify AI integration with OpenRouter for stability
- Improve UX: veto flow, pizza tracking, loading states, mobile responsiveness
- Add comprehensive test coverage (Playwright E2E + unit tests)
- Fix code convention issues (`$types` imports, `.svelte.ts` suffixes)

**Non-Goals:**
- Migrating existing anonymous sessions to new auth model (fresh start)
- Supporting multiple admin accounts per session (single admin/host)
- Implementing social login providers (email/password only)
- Building a full user management dashboard

## Decisions

### 1. Admin Auth: Firebase Email/Password with Emulator Setup Script

**Decision**: Use Firebase Email/Password authentication for admin users, with a setup script (`scripts/setup-admin-user.ts`) that creates an admin user in the emulator.

**Rationale**: Firebase Auth is already partially integrated (anonymous). Email/password is simple, secure, and works with the emulator. A setup script makes it easy to bootstrap the admin user during development.

**Alternatives considered**:
- Custom JWT tokens: More complex, no need for self-issued tokens when Firebase Auth provides this
- Magic link / OAuth: Overkill for this use case; adds external dependencies

### 2. Guest Flow: Anonymous Auth Linked to Session

**Decision**: Guests joining via shared link continue to use anonymous Firebase auth. The admin creates a session, gets a shareable link, and friends click it to join. The join page captures a username and creates an anonymous auth account linked to that session.

**Rationale**: Keeps the "no login required" experience for guests while securing the admin role. Session-users are stored in Firestore with `sessionId + uid` as document ID.

### 3. Avatar Generation: dicebear Package

**Decision**: Use `dicebear` (https://www.npmjs.com/package/@dicebear/core with `@dicebear/collection`) for generating default avatars. Users can also upload custom avatars to Firebase Storage.

**Rationale**: Dicebear is lightweight, has many styles (e.g., `adventurer`, `avataaars`, `bottts`), and generates SVG/ PNG avatars deterministically from a seed (username). This avoids shipping emoji or placeholder images.

**Alternatives considered**:
- UI Avatars API: Requires network request, not offline-capable
- Custom SVG generation: Re-inventing the wheel

### 4. AI Integration: OpenRouter with Gemini Fallback

**Decision**: Use OpenRouter API as the primary AI provider (via `@openrouter/ai-sdk` or direct fetch), with the existing Gemini integration as a fallback. Configure via environment variable `OPENROUTER_API_KEY`.

**Rationale**: OpenRouter provides access to many models (Gemini, Claude, GPT) with better uptime. The 503 error from Gemini indicates capacity issues. OpenRouter acts as a unified API gateway.

**Implementation approach**:
- Create a new Genkit model wrapper or direct API client for OpenRouter
- Wrap AI calls with try/catch: try OpenRouter first, fallback to Gemini
- Show user-friendly error messages via snackbar instead of raw API errors

### 5. Snackbar Notifications: Custom Svelte Component

**Decision**: Build a global snackbar notification system using a Svelte 5 rune-based store (`snackbar.svelte.ts`). The component renders at the app root level.

**Rationale**: Snackbars are non-blocking, auto-dismiss notifications perfect for loading states ("Suggesting movies...") and error messages. A centralized service avoids prop-drilling.

### 6. Veto Flow Changes

**Decision**:
- Vetoed cards appear at the end of the grid (filter and re-sort after non-vetoed)
- "Other" reason becomes a direct text input field (not a button that needs clicking)
- Remove ticket display from vetoed cards (they can't be voted on anyway)

**Rationale**: These are UX improvements based on user feedback. Moving vetoed items to the end reduces visual clutter while maintaining transparency.

### 7. Host-only Wheel Spin

**Decision**: Check `session.hostId === currentUser.uid` before allowing the Grand Reveal. Non-hosts see a disabled button with tooltip/error.

**Rationale**: Only the session creator should control the reveal. This prevents race conditions and confusion.

### 8. Code Convention Fixes

**Decision**:
- Rename `src/lib/viewmodels/*.ts` to `*.svelte.ts` (already done for some: `entry-hall.viewmodel.svelte.ts`, `selection-lounge.viewmodel.svelte.ts`)
- Ensure `src/lib/client/services/session.svelte.ts` keeps its `.svelte.ts` suffix (already correct)
- Update all type imports from direct paths to use `$types` alias (e.g., `from "$types"` instead of `from "$lib/shared/types/session"`)

**Rationale**: Svelte 5 runes require the `.svelte.ts` suffix for proper reactivity. The `$types` alias is configured for cleaner imports.

### 9. Test Strategy: Playwright + Vitest

**Decision**:
- Playwright for E2E tests: admin login → create session → share link → guest joins → vote → reveal
- Vitest for unit tests: viewmodels, services, utility functions
- Use Firebase emulator for E2E tests (already configured via `dev:emulator`)

**Rationale**: Playwright is already configured in the project. Vitest pairs well with Svelte 5 for unit testing rune-based code.

## Risks / Trade-offs

**[Risk]** OpenRouter API key required → **Mitigation**: Document setup in README; fallback to Gemini if OpenRouter unavailable

**[Risk]** Firebase Storage for avatars adds complexity → **Mitigation**: Start with dicebear defaults; avatar upload is optional

**[Risk]** Emulator admin user script needs to run before testing → **Mitigation**: Add to `dev:emulator` startup or document in README

**[Risk]** Changing veto card positioning affects existing sessions → **Mitigation**: Purely client-side change; no migration needed

**[Risk]** `$types` alias changes may break existing imports → **Mitigation**: Update all imports systematically; run type-check before committing

**[Risk]** Mobile responsiveness changes may affect desktop layout → **Mitigation**: Test on multiple viewports; use responsive Tailwind classes
