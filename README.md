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
│   ├── gen-types.mjs      # regenerates packages/shared-types/src/database.ts
│   └── check-contrast.ts  # WCAG contrast check for the mobile theme colours
├── docs/
│   ├── ARCHITECTURE.md    # how the mobile theme and UI components fit together
│   └── design/            # exported design boards (reference only)
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
pnpm check:contrast # WCAG contrast table for every theme colour pair
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

### Phone numbers

`profiles.phone` is a sign-in identifier and unique per account. A trigger
stores it through `public.normalize_phone()`
([`20260930163050_normalize_bd_phone.sql`](supabase/migrations/20260930163050_normalize_bd_phone.sql)):
Bangladesh mobile numbers typed as `01…`, `880…`, `+880…` or `00880…` are
stored as `+8801XXXXXXXXX`; other numbers only lose spaces, dashes and
parentheses. Lookups normalize their input the same way, so any of those
forms finds the account. Emergency contact numbers are not normalized.

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

### Edge functions

Functions live in [`supabase/functions/`](supabase/functions/). There's no
deploy workflow; each one is deployed by hand after its PR merges.

- **`send-alert-email`** — emails guardians when an alert is raised
  (called by a database trigger). Needs the `RESEND_API_KEY` secret.
- **`auth-identifier`** — phone-number sign-in and password reset that
  never returns the account's email, with per-IP and per-phone rate limits
  (`auth_rate_limit_events`, see
  [`20260929204605_auth_rate_limit.sql`](supabase/migrations/20260929204605_auth_rate_limit.sql)).
  Email sign-in stays a direct `signInWithPassword` call. Deployed with JWT
  verification on, which relies on clients sending the legacy anon key.
  Its `normalizePhone()` must match `public.normalize_phone()` (see
  [Phone numbers](#phone-numbers)); redeploy it whenever that rule changes.
  Secrets, set under **Edge Functions → Secrets** in the Supabase dashboard:

  | Secret                     | Used for                                                                          |
  | -------------------------- | --------------------------------------------------------------------------------- |
  | `AUTH_RATE_LIMIT_SALT`     | HMAC key for the stored phone/IP hashes; the function returns 503 until it's set  |
  | `DASHBOARD_FORWARD_SECRET` | lets the dashboard server pass the end user's IP; same value in the dashboard env |

  Callers pin it to the database's region with the `x-region` header;
  otherwise it runs in the region nearest the caller and every database
  round trip crosses regions. The dashboard reads the region from
  `SUPABASE_FUNCTION_REGION` in `dashboard/.env.local` (and from the hosting
  environment's variables if the dashboard is deployed). The mobile app
  reads `EXPO_PUBLIC_SUPABASE_FUNCTION_REGION` from `mobile/.env` locally
  and from `mobile/eas.json` for EAS builds.

  `public.resolve_login_identifier()` is the older phone lookup, still
  anon-callable because app 1.1.0 uses it for sign-in, reset and the
  sign-up phone check. Later app versions and the dashboard no longer call
  it, so any remaining calls to `/rest/v1/rpc/resolve_login_identifier`
  come from old installs (or scripts); revoke anonymous access once those
  are negligible.

  Its request handling is tested under Node with the Supabase calls faked:

  ```bash
  pnpm test:auth-identifier
  ```

## Design system (mobile)

Colours, spacing, radius, type and shadows live in
[`mobile/theme/`](mobile/theme/) and are read through `useTheme()`. Base
components (`Text`, `Button`, `Input`, `PasswordInput`, `Card`, `Screen`,
`Banner`, `SegmentedControl`, `IconTile`) live in
[`mobile/components/ui/`](mobile/components/ui/). New and reworked screens
use these instead of inline colours and styles; the older
`mobile/constants/Colors.ts` stays only until every screen has moved over.

- **Fonts**: Sora (headings), Figtree (body) and Hind Siliguri (Bangla), all
  under the SIL Open Font License 1.1, loaded at startup from the
  `@expo-google-fonts/*` packages.
- **Contrast**: after changing a colour, run `pnpm check:contrast`; it fails
  if any text/background pair drops below WCAG AA in either theme.
- **Background photos**: only on welcome, auth, onboarding and empty-state
  screens. Each file must be listed in
  [`mobile/assets/backgrounds/CREDITS.md`](mobile/assets/backgrounds/CREDITS.md).
- **Component gallery**: in a development build, open
  `safepath://dev/ui-gallery` to see every component in the current theme and
  language. Other builds redirect away from it.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the details.

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
- **PR checks**: [`.github/workflows/pr-checks.yml`](.github/workflows/pr-checks.yml)
  runs `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test:rls`
  and `pnpm test:auth-identifier` on every pull request. It needs no
  secrets; neither test suite touches the live project.

## What's intentionally not here yet

- Auth flow (login, session handling, guardian-user linking)
- SOS trigger and alert delivery logic
- Any application code — mobile/dashboard screens or API routes — that
  actually reads or writes `profiles`, `guardian_links`,
  `emergency_contacts`, `alerts`, `alert_locations`, or `push_tokens`
- Any real network calls from either app's Supabase client

These land in follow-up steps.
