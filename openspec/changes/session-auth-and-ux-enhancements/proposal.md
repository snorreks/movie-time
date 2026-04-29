## Why

The Director's Lounge currently uses anonymous Firebase auth for all users, making it impossible to distinguish session hosts from regular participants. The app needs proper admin authentication, session naming, avatar support, improved UX patterns (veto flow, pizza tracking, loading states), and more stable AI integration. Additionally, the codebase needs test coverage and adherence to naming conventions (.svelte.ts suffix for client services and viewmodels, proper `$types` imports).

## What Changes

- **Admin Authentication**: Add email/password login for admin users using Firebase Auth, with a setup script for the emulator
- **Session Creation Flow**: Admin creates named sessions and shares secure links with friends
- **Guest User Flow**: Friends join via shared link, choose a username, and get an anonymous Firebase auth account linked to the session
- **Avatar Support**: Users can upload avatar images; default avatars generated via a package like `dicebear` with random fallback avatars
- **AI Integration**: Replace or augment Gemini with OpenRouter API for more stable model access, with graceful fallback error handling
- **Veto Card Improvements**: Move vetoed movies to the end of the card grid; change "Other" veto reason to a direct text input field; remove ticket display from vetoed cards
- **Pizza Tracking Display**: Show which users are down for pizza in the lounge
- **Host-only Wheel Spin**: Restrict the Grand Reveal wheel spin to session owners only
- **Loading & Error States**: Replace basic loading indicators with snackbar notifications; provide descriptive error messages throughout
- **Session Naming**: Allow admins to set a display name for their session (e.g., "Friday Night Movies")
- **Mobile Responsiveness**: Improve mobile view styling for all pages
- **Test Coverage**: Add Playwright E2E tests and unit tests for critical paths
- **Code Convention Fixes**: Rename `session.svelte.ts` to follow `.svelte.ts` suffix convention; ensure all type imports use `$types` alias

## Capabilities

### New Capabilities
- `admin-auth`: Admin user email/password authentication with Firebase Auth and emulator setup script
- `avatar-management`: User avatar upload to Firebase Storage and default avatar generation with dicebear
- `session-naming`: Allow admins to name sessions during creation
- `pizza-tracking-display`: Show list of users who want pizza in the lounge UI
- `ai-openrouter`: OpenRouter API integration as alternative/backup to Gemini with graceful fallback
- `snackbar-notifications`: Global snackbar system for loading states and error messages
- `mobile-responsive-design`: Mobile-first responsive improvements across all pages
- `playwright-tests`: End-to-end and unit test suite with Playwright and Vitest

### Modified Capabilities
- `session-creation`: Modified to support admin auth, session naming, and shareable links for guests
- `veto-flow`: Modified to reposition vetoed cards, change "Other" to text input, remove tickets from vetoed cards
- `grand-reveal`: Modified to restrict wheel spin to session owner only
- `error-handling`: Modified to provide more descriptive error messages across the app

## Impact

- **Firebase**: New Auth users (admin email/password), Storage bucket for avatars, potential new Firestore fields (session name, user photoURL)
- **Dependencies**: Add `dicebear` (avatar generation), `@openrouter/ai-sdk` or similar (OpenRouter client), Playwright, Vitest
- **Scripts**: New `scripts/setup-admin-user.ts` for emulator admin user creation
- **Components**: New Snackbar component, updated NominationCard, updated entry hall and lounge pages
- **ViewModels**: Updates to `entry-hall.viewmodel.svelte.ts` and `selection-lounge.viewmodel.svelte.ts`
- **Services**: Update `session.svelte.ts` (ensure .svelte.ts suffix), potentially new `auth.svelte.ts` client service
- **Genkit**: Replace or wrap Gemini flows with OpenRouter fallback
- **Types**: May need updates to `Session` and `SessionUser` types (ensure `$types` imports)
