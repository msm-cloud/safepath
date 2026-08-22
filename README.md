# SafePath

SafePath is a safety alert app connecting at-risk users (students, women
commuting late) with their guardians.

The repository has two things in it so far: the app scaffolding (mobile +
dashboard, no screens wired to real data) and the database schema (tables +
RLS policies, no application code reading/writing them yet). Auth flow, SOS
logic, and UI are still to come.

## Folder structure

```
safepath/
├── mobile/              # Expo app (React Native + TypeScript, Expo Router)
├── dashboard/            # Next.js 14+ app (TypeScript + Tailwind CSS, App Router)
├── packages/
│   └── shared-types/     # Shared TypeScript types (@safepath/shared-types)
├── supabase/
│   ├── config.toml        # local Supabase CLI project config
│   └── migrations/        # schema + RLS, applied in filename order
├── scripts/
│   └── gen-types.mjs      # regenerates packages/shared-types/src/database.ts
├── package.json          # root workspace config
├── pnpm-workspace.yaml    # pnpm workspace definition
├── eslint.config.mjs      # shared base ESLint config, extended by both apps
├── .prettierrc.json       # shared Prettier config (auto-discovered by both apps)
└── README.md
```

- **`mobile/`** — Expo (React Native + TypeScript) app using Expo Router.
  Tab shell with placeholder screens: Home, SOS, Contacts, Settings.
  [`lib/supabase.ts`](mobile/lib/supabase.ts) sets up a Supabase client from
  env vars (no calls made yet).
- **`dashboard/`** — Next.js (App Router, TypeScript, Tailwind CSS) app for
  guardians. Placeholder pages: `/login`, `/dashboard`, `/dashboard/[userId]`.
  [`lib/supabase/client.ts`](dashboard/lib/supabase/client.ts) and
  [`lib/supabase/server.ts`](dashboard/lib/supabase/server.ts) follow
  Supabase's official Next.js App Router SSR pattern (no calls made yet, no
  auth flow wired up).
- **`packages/shared-types/`** — TypeScript types shared between both apps as
  `@safepath/shared-types`. [`src/database.ts`](packages/shared-types/src/database.ts)
  is a hand-written stand-in, structurally matching the migrations below,
  for the real output of `supabase gen types typescript`; `pnpm gen:types`
  overwrites it once a real project exists. `Profile`, `Alert`,
  `GuardianLink`, and `EmergencyContact` are re-exported from it under those
  same names so app code never changes when it's regenerated.
- **`supabase/migrations/`** — the database schema: `profiles`,
  `guardian_links`, `emergency_contacts`, `alerts`, `alert_locations`, and
  `push_tokens`, each with Row-Level Security enabled and policies scoped to
  the owning user and their accepted guardians. See the comments in each
  migration file for the reasoning behind each policy. No table is read or
  written by any application code yet.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+ (`corepack enable` will pick up the pinned
  version from `package.json#packageManager`)

## Getting started

Install all workspace dependencies from the repo root:

```bash
pnpm install
```

Copy each app's `.env.example` to a real env file and fill in your Supabase
project values (a Supabase project isn't set up yet — this is just wiring):

```bash
cp mobile/.env.example mobile/.env
cp dashboard/.env.example dashboard/.env.local
```

### Run the mobile app (Expo)

```bash
pnpm --filter mobile dev
```

Then press `i` (iOS simulator), `a` (Android emulator), or `w` (web) in the
Expo CLI, or scan the QR code with Expo Go.

### Run the dashboard (Next.js)

```bash
pnpm --filter dashboard dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Other useful commands

Run from the repo root, across every workspace package:

```bash
pnpm lint          # lint mobile, dashboard, and shared-types
pnpm typecheck      # tsc --noEmit across every package
pnpm format         # format the whole repo with Prettier
pnpm format:check   # check formatting without writing
```

Or scope any script to a single package with `--filter`, e.g.
`pnpm --filter dashboard lint`.

## Database

The schema lives in [`supabase/migrations/`](supabase/migrations/) as
Supabase CLI migrations (`<timestamp>_<name>.sql`, applied in filename
order). The Supabase CLI is a root devDependency, so it's always available
via `pnpm exec supabase` — no global install needed.

```bash
pnpm exec supabase start        # start the local stack (requires Docker)
pnpm exec supabase db reset     # (re)apply every migration to the local db
pnpm exec supabase link         # link this repo to a real Supabase project
pnpm exec supabase db push      # apply migrations to the linked project
```

Before any of that, [`supabase/tests/rls.test.mjs`](supabase/tests/rls.test.mjs)
applies every migration to an in-process Postgres (no Docker needed) and
exercises RLS as distinct authenticated users would actually see it —
useful for catching a policy mistake without a local stack:

```bash
pnpm test:rls
```

Once you have a local or linked project, regenerate the shared TypeScript
types from the real schema:

```bash
pnpm gen:types                              # against the local stack (supabase start)
SUPABASE_PROJECT_ID=<ref> pnpm gen:types    # against a specific remote project
pnpm gen:types -- --linked                  # against the project linked via `supabase link`
```

This overwrites [`packages/shared-types/src/database.ts`](packages/shared-types/src/database.ts)
in place, keeping the same `Profile` / `Alert` / `GuardianLink` /
`EmergencyContact` exports.

### CI: migrations

Two GitHub Actions workflows keep `supabase/migrations/` in sync with the
live project. Both need these repo secrets set under
**Settings → Secrets and variables → Actions**:

| Secret                  | Used for                                              |
| ----------------------- | ----------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | authenticating the CLI with the Supabase platform API |
| `SUPABASE_PROJECT_REF`  | which project to link (`supabase link --project-ref`) |
| `SUPABASE_DB_PASSWORD`  | the direct Postgres connection `db push` needs        |

- **[`validate-migrations.yml`](.github/workflows/validate-migrations.yml)**
  — runs on pull requests that touch `supabase/migrations/**`. Links the PR
  branch to the live project and runs `supabase db push --dry-run`: it
  reports whether the new migrations would apply cleanly, without touching
  any database. A safety check before merge, not a deploy.
- **[`deploy-migrations.yml`](.github/workflows/deploy-migrations.yml)** —
  runs on push to `main`, only when `supabase/migrations/**` changed. Links
  to the live project and runs a real `supabase db push`, applying any
  migration not yet on the production database. Fails loudly (a red
  `::error::` annotation, not just a buried CLI log) if the push fails, so a
  broken migration can't merge silently.

## Tooling

- **pnpm workspaces** link `mobile`, `dashboard`, and `packages/shared-types`
  together, so both apps import shared types as `@safepath/shared-types`.
- **ESLint**: a shared base config lives at the repo root
  ([`eslint.config.mjs`](eslint.config.mjs)) and is extended by
  [`mobile/eslint.config.mjs`](mobile/eslint.config.mjs) (adds
  `eslint-config-expo`) and
  [`dashboard/eslint.config.mjs`](dashboard/eslint.config.mjs) (adds
  `eslint-config-next`).
- **Prettier**: a single [`.prettierrc.json`](.prettierrc.json) at the repo
  root is picked up automatically by both apps (Prettier searches parent
  directories for config).

## What's intentionally not here yet

- Auth flow (login, session handling, guardian-user linking)
- SOS trigger and alert delivery logic
- Any application code — mobile/dashboard screens or API routes — that
  actually reads or writes `profiles`, `guardian_links`,
  `emergency_contacts`, `alerts`, `alert_locations`, or `push_tokens`
- Any real network calls from either app's Supabase client

These land in follow-up steps.
