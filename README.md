# The Director's Lounge

A cinematic movie night coordination app built with SvelteKit, Firebase, and AI.

**🎬 Live App:** [movie-time-onboardr.vercel.app](https://movie-time-onboardr.vercel.app/)

## Features

- **Session-based movie nights**: Create or join sessions with unique shareable URLs
- **Admin dashboard**: Manage sessions, edit your username, and host the lounge
- **Admin joins lounge**: The host can join their own lounge to participate and spin the wheel
- **AI Concierge**: Get movie recommendations powered by Google Gemini and TMDB
- **Golden Ticket voting**: Each user gets 3 votes to allocate to nominated movies
- **Veto system**: Hosts can veto movies to exclude them from selection
- **Delete nominations**: Nomination creators or the host can completely remove a nomination (votes are returned to users)
- **Grand Reveal**: CS:GO-style animated reel reveal of the winning movie
- **Spin the Wheel**: Only the host can trigger the final reveal
- **Waiting state**: Non-admin users see "Waiting for Movie Time..." until the host spins
- **Pizza toggle**: Track who wants pizza for the movie night
- **Session persistence**: Admin sessions are stored via HTTP-only cookies
- **Username management**: Users (including admins) can set and update their display names

## Tech Stack

- **Framework**: SvelteKit with Svelte 5 runes
- **Styling**: Tailwind CSS 4 with custom design tokens (cinematic dark theme)
- **Backend**: Firebase (Firestore, Auth with Admin SDK)
- **AI**: Genkit with Google Gemini 2.5 Flash
- **Movie Data**: TMDB API
- **Testing**: Playwright with Bun
- **Emulator**: Firebase emulators for local development

## Prerequisites

- Node.js >= 18
- Bun runtime
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase emulators installed (`firebase init emulators`)
- GitHub CLI (`gh`) for uploading secrets

## Environment Variables

Create a `.env` file in the project root. Variables are split between:

**1. GitHub Secrets** (upload with `bun run upload-secrets`):
```
TMDB_API_KEY=your_tmdb_api_key
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_access_token
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key  # Optional fallback
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # JSON string
GCLOUD_PROJECT=your_firebase_project_id
```

**2. Vercel Dashboard Variables** (add in Vercel project settings):
```
PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id
PUBLIC_LOG_LEVEL=verbose
PUBLIC_FLAVOR=production
```

## Upload Secrets to GitHub

After creating your `.env` file, upload all secrets to GitHub:

```bash
# Authenticate with GitHub CLI first (if not already)
gh auth login

# Upload all secrets from .env
bun run upload-secrets
```

Verify uploaded secrets:
```bash
gh secret list
```

Get your TMDB API key at: https://www.themoviedb.org/settings/api
Get your Gemini API key at: https://aistudio.google.com/app/apikey

## Installation

```bash
bun install
```

## Development

### Start Firebase Emulators

```bash
bun run emulate
```

This starts the Firebase emulators (Auth, Firestore, Storage) at `http://127.0.0.1:4000`

### Start Development Server

```bash
bun run dev:emulator
```

The app will be available at `http://localhost:5173`

## Deployment

### Vercel Deployment with GitHub Actions

The project uses GitHub Actions with Bun runtime for fast builds and deploys to Vercel.

**Setup steps:**

1. **Create Vercel project:**
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   ```

2. **Get Vercel credentials:**
   - `VERCEL_TOKEN`: https://vercel.com/account/tokens
   - `VERCEL_ORG_ID`: Check `.vercel/project.json` after linking
   - `VERCEL_PROJECT_ID`: Check `.vercel/project.json` after linking

3. **Upload secrets to GitHub:**
   ```bash
   gh auth login
   bun run upload-secrets
   ```

4. **Push to deploy:**
   ```bash
   git push origin main
   ```

The GitHub Action will automatically build and deploy to Vercel on every push to `main`.

### Manual Vercel Deploy

```bash
bun run build
vercel --prod
```

## Project Structure

```
src/
├── lib/
│   ├── client/
│   │   ├── firebase/      # Firebase client SDK initialization
│   │   └── services/      # Client-side services (session, snackbar, avatar)
│   ├── server/
│   │   ├── firebase/      # Firebase Admin SDK initialization
│   │   └── genkit/        # Genkit AI flows
│   ├── shared/
│   │   ├── types/         # Shared TypeScript types
│   │   └── logger.ts      # Logging utility
│   ├── viewmodels/        # ViewModels (Svelte 5 runes pattern)
│   └── components/        # Reusable Svelte components
├── routes/
│   ├── +page.svelte            # Admin panel (create/join sessions)
│   ├── api/auth/session/       # Session cookie management
│   └── lounge/
│       └── [sessionId]/
│           ├── +page.svelte      # Selection Lounge
│           └── +page.server.ts   # Server-side auth check
└── hooks.server.ts              # Session cookie verification
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run dev:emulator` - Start dev server with emulator mode
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run emulate` - Start Firebase emulators
- `bun run emulate:local` - Start emulators from local firestack build
- `bun run check` - Type checking with svelte-check
- `bun run fix` - Format and lint with Biome

## Design Tokens

The app uses a cinematic dark theme:
- Background: `#08080A`
- Primary (Gold): `#D4AF37`
- Surface (Glassmorphic): RGBA white with opacity
- Text: `#FDFCFA`
- Accent (Red): `#C82333`
- Fonts: Playfair Display (headings), Outfit (body)

## Logging

The app includes comprehensive logging via the `logger` utility:
- Set `LOG_LEVEL=DEBUG` in `.env` for verbose logging
- Logs appear in browser console and server terminal
- Structured logging with log levels (DEBUG, INFO, WARNING, ERROR)

## License

MIT
