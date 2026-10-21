# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

blr_eats is a shareable personal food map of Bangalore. The core idea: food recommendations shared as lists are boring, so each person gets a punchy, colourful map they can share as one link (the whole map, a slice like `/manoj/south-indian`, or one spot). The UI is the product, and the backend is deliberately thin.

Product decisions and their reasons live in `DECISIONS.md`. It's local and gitignored. Read it before changing product behaviour, and add a row when a decision is made or changed.

## Commands

- `npm run dev`: dev server (add `-- --host` to open it on a phone on the same Wi-Fi)
- `npm run check`: svelte-check / TypeScript. Run after every change; there are no unit tests yet.
- `npm run lint` / `npm run format`: Prettier + ESLint
- `npm run build`: production build (Vercel adapter)
- `node scripts/shot.mjs <url> <out.png> [waitMs] ["await page.click(...)"]`: Pixel 7-sized screenshot through the system Edge browser, printing console errors. Use it to check UI changes.
- `node --env-file=.env scripts/e2e-signup.mjs <outDir>` / `scripts/e2e-paste-list.mjs`: full journeys in a phone browser against the dev server (or `BASE_URL`), with a throwaway user
- `node scripts/icons.mjs`: re-render the PNG app icons from `static/icon.svg`

## SvelteKit 3 specifics (newer than most examples)

- Library imports use package imports with **explicit extensions**: `#lib/theme.ts`, `#lib/components/MapView.svelte`. A bare `#lib/theme` doesn't resolve.
- Environment variables are declared in `src/env.ts` (`defineEnvVars`) and imported from `$app/env/public` / `$app/env/private`. There's no `$env/static/*`.
- The `Handle` type comes from `@sveltejs/kit/hooks`. `goto()` options are `replace` / `reset` / `refreshAll`.
- Svelte 5 runes are forced on for project files.
- On Windows, don't edit files through Windows PowerShell 5.1's `Get-Content`/`Set-Content`. It mis-reads UTF-8 and corrupts emoji. Use the editor tools or Git Bash.

## Architecture

- **One screen for owners and viewers.** `src/routes/[handle]/+layout.svelte` renders `MapScreen` for `/[handle]`, `/[handle]/[[slice]]` and `/[handle]/spot/[slug]`. The map lives in the layout so switching slice or spot never re-creates it. The child pages only set link-preview tags (`ShareMeta.svelte`). The owner gets extra controls when `me.id === map.profile.id`.
- **Data loading:** `src/lib/server/maps.ts#getMap` is the only loader. `demo` comes from `server/seed.ts`; every other handle comes from Supabase. The root `+layout.server.ts` returns `me` (signed-in user + handle).
- **Writes** go straight from the browser to Supabase (`src/lib/spots-client.ts`) and are protected by Row Level Security (public read, owner write; photos live in the `photos` bucket under `<uid>/…`). After a write, call `refreshAll()`. Schema and policies: `supabase/migrations/0001_init.sql`.
- **Slices:** `src/lib/slices.ts` resolves a URL segment as a fixed category key, then a custom category slug, then an area slug. The fixed categories are in `src/lib/categories.ts`, and the DB has a check constraint listing the same keys. Keep the two in sync.
- **Theme:** `src/lib/theme.ts` is one object per theme: UI tokens (exposed as CSS variables and Tailwind colours via `@theme inline`), map colours (`src/lib/map/style.ts` builds the MapLibre style) and per-category swatches (also used by the link-preview images). Add a theme by adding an object.
- **Map:** MapLibre with OpenFreeMap tiles (no key). The worker URL must be set explicitly (`setWorkerUrl` with a `?url` import). Pins are HTML markers clustered with supercluster. MapLibre positions markers with `transform`, so animate the inner `.pin-pop` element, never `.pin`.
- **Link previews:** `src/routes/og/[handle].png/+server.ts` renders a PNG with satori + resvg (`src/lib/server/og.ts`), using `?slice=` / `?spot=` variants. `@resvg/resvg-js` is native, so it's excluded from Vite's dep optimizer and SSR bundling.
- **Sign-in:** a 6-digit email code (`SignIn.svelte`, `verifyOtp`), plus `auth/callback` for the email link (`token_hash`). The flow is `/welcome` (pick a handle) → `/<handle>?add=top`, which opens the bulk "Add your top spots" sheet.
- **Place search:** `findPlaces` in `src/lib/places.ts`. Sources, best first: places already pinned on blr_eats maps (`search_known_places`) and our own index of ~15k Bangalore food places loaded from Overture Maps (`public.places`, `search_places`), both pg_trgm and typo-tolerant, then Photon (OpenStreetMap) as a 3-second backup. Refresh the index with `node scripts/overture-places.mjs <out.json>` then `node --env-file=.env scripts/load-places.mjs <out.json>`. Index places have `x:` ids and are saved without an OSM id. The DB also rejects coordinates outside Bangalore. A pasted Google Maps link is resolved server-side by `/api/place-link` (`server/google-maps.ts` reads the name and pin from the redirected URL, with no Google API).
- **AI:** `src/lib/server/ai.ts` (`aiJson`, any OpenAI-compatible API, Groq by default) powers Ask this map (`server/ask.ts`) and paste a list (`server/parse-list.ts`, `/api/parse-list`). The AI only extracts or picks; places always come from real data. Both share the daily `take_ai_ask` caps.

## Principles that shape changes

- Mobile first and fast: the header renders on the server, MapLibre loads lazily, cards appear within 2 s even if the map is slow, and animations are cheap and honour `prefers-reduced-motion`.
- A map with 3 spots and no photos must still look good. No-photo cards are a designed look, not a placeholder.
- The Share button shares whatever is on screen.
