# RunwayBriefing — FIDS (Flight Information Display System)

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript 5 (strict)
- Zustand 5 for state management
- Tailwind CSS 4
- PostgreSQL 16 (via pg library, no ORM)
- Docker Compose (dev + prod configs)

## Code Style
- ES modules (import/export), never CommonJS (require)
- Path aliases: import from '@/types', '@/store', '@/lib', '@/components'
- Prefer const over let, never use var
- Destructure imports: import { Flight } from '@/types'

## Project Structure
- app/ — Next.js App Router pages and API routes
- app/api/flights/route.ts — REST API (GET, POST, PATCH, DELETE)
- components/fids/ — flight board UI components
- components/admin/ — admin panel components
- store/flightsStore.ts — Zustand store with filters and selectors
- types/index.ts — Flight, FlightStatus, Airline, Terminal types
- lib/db.ts — PostgreSQL connection pool (pg)
- lib/flights.ts — server-side read/write to PostgreSQL (async)
- scripts/seed.ts — seeds database from flights.seed.json
- data/flights.seed.json — seed data for reset
- compose.yaml — base Docker Compose config
- compose.override.yaml — dev overrides (bind mount, hot reload, db port)
- compose.prod.yaml — production overrides (resource limits, restart policy)

## Workflow
- Dev server: docker compose up (starts app + PostgreSQL)
- Seed database: docker compose exec app npm run seed
- Dev server (without Docker): npm run dev (requires DATABASE_URL)
- Typecheck: npm run typecheck
- Lint: npm run lint
- Production: docker compose -f compose.yaml -f compose.prod.yaml up -d

## Constraints
- Never modify data/flights.seed.json (seed data for reset)
- Do not install new dependencies without asking first
- API routes return NextResponse.json(), not raw Response
- All flight data mutations go through lib/flights.ts (readFlights/writeFlights) — both are async
- Database connection via lib/db.ts pool — do not create new Pool instances

## Architecture
- API routes in app/api/ handle HTTP (thin controllers)
- Business logic lives in lib/ (server-side only, uses PostgreSQL via pg)
- Client state in store/flightsStore.ts — single Zustand store
- Components are client ('use client') or server (default) — don't mix