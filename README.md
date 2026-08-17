# FindIt

Production-oriented real-time Lost & Found app: **Next.js App Router**, **TypeScript**, **Tailwind**, **Supabase (PostGIS + Realtime + Auth + Storage)**, **Mapbox GL JS**.

## What you get

| Layer | Implementation |
| --- | --- |
| Schema | `supabase/migrations/20240817_init.sql` — profiles, items (`geography`), images, conversations, messages, RPCs, RLS, storage, realtime |
| App Router | `app/` pages, auth callback, `/api/match`, `/api/items/nearby` |
| Map | `components/map/findit-map.tsx` — clusters, red lost / green found, live GeoJSON, radius polygon |
| Alerts | Home-area radius + toast on `items` INSERT via Realtime |
| AI matcher | Vision tags → `visual_tags` → `match_opposing_items` (opposing lost↔found) |
| Claims | Finder sets a secret question; claimant must match before precise details |

## Directory structure

```
app/
  layout.tsx / page.tsx / globals.css
  login/page.tsx
  auth/callback/route.ts
  api/match/route.ts
  api/items/nearby/route.ts
components/
  map/findit-map.tsx          ← primary Mapbox + clustering
  map/radius-slider.tsx
  items/item-list.tsx
  items/report-item-modal.tsx
  chat/chat-panel.tsx
  claims/verify-claim-modal.tsx
  findit-shell.tsx            ← map/list toggle, alerts, report flow
  layout/header.tsx
  ui/                         ← shadcn-style primitives
hooks/
  use-items-realtime.ts
  use-home-area-alerts.ts
lib/
  supabase/client.ts | server.ts | middleware.ts
  geo.ts / types.ts / utils.ts
supabase/migrations/20240817_init.sql
```

## Setup

1. Create a Supabase project. Enable **PostGIS** and **pgvector** (Database → Extensions). Enable Realtime for `items`, `messages`, `conversations` if the migration publication step is skipped.
2. Auth → enable Email magic link and Google/GitHub OAuth. Add redirect `http://localhost:3000/auth/callback`.
3. Run the SQL in `supabase/migrations/20240817_init.sql` (SQL editor or `supabase db push`).
4. Copy `.env.example` to `.env.local` and fill:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
OPENAI_API_KEY=          # or GEMINI_API_KEY
AI_PROVIDER=openai
```

5. Install and run:

```bash
npm install
npm run dev
```

Mapbox token: [mapbox.com](https://account.mapbox.com/). Radius slider is 1–20 km and re-queries `items_within_radius` (PostGIS `ST_DWithin` on `geography`, meters).

## Security notes

- Precise coordinates are **not** exposed by `items_public` / the nearby RPC. Use `item_precise_details` after a **verified** conversation.
- Verification answers are stored as SHA-256 of the normalized string, never as plaintext.
- Storage uploads must live under `{auth.uid()}/...`.
- Chat RLS is participant-only; Realtime still respects RLS when the client is authenticated.
