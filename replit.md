# Do it

A minimalist productivity PWA for task management, habit tracking, and AI voice-to-task input.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/do-it run dev` — run the frontend (port 25531)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, framer-motion, wouter, @tanstack/react-query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (Replit-managed)
- Auth + User identity: Supabase (email/password)
- AI: Google Gemini 2.5 Flash (audio transcription)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/tasks.ts` — tasks table schema
- `lib/db/src/schema/habits.ts` — habits + habit_logs table schema
- `artifacts/do-it/src/` — React frontend
- `artifacts/do-it/src/contexts/AuthContext.tsx` — Supabase auth state
- `artifacts/do-it/src/lib/supabase.ts` — Supabase client
- `artifacts/api-server/src/routes/` — Express route handlers
- `supabase/schema.sql` — Supabase SQL schema for RLS (run manually in Supabase dashboard)

## Architecture decisions

- Auth uses Supabase for identity (email/password); all app data is stored in Replit's Postgres via Drizzle ORM. The API routes receive `userId` from the client (the Supabase user ID) and use it to scope queries.
- Audio transcription sends base64-encoded audio to the API server, which calls Gemini to extract a structured task JSON, then saves it to the DB.
- The frontend uses Orval-generated React Query hooks for all API calls — no raw fetch.
- The Supabase `schema.sql` file is for reference/RLS setup in Supabase dashboard; the actual app DB is Replit's Postgres.

## Product

- Task management: create, complete, delete tasks with animated completion circles
- Voice input: hold mic button to record audio → Gemini extracts title/description/due date
- Habit tracker: daily habit logging with 7-day visual grid
- Calendar: tasks grouped by due date
- Auth: Supabase email/password with persistent sessions

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Frontend needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars (set alongside `NEXT_PUBLIC_*` ones)
- Run `pnpm run typecheck:libs` before leaf package typechecks when changing `lib/db/src/schema/`
- The Supabase `schema.sql` is for if the user wants to use Supabase as the DB instead of Replit's Postgres — not needed for normal operation

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
