# Divinotes

**Divinotes** is a privacy-oriented, local-first workspace for notes and light project organization. It pairs a calm, Notion-like structure (projects, rich notes, lists, and cross-note links) with **AI that runs in your browser** on supported hardware (WebGPU via WebLLM), so core assists stay on your machine instead of being shipped to a remote model for every keystroke.

The product direction is **offline-capable productivity**: the experience should stay usable when the network is poor or absent, with PostgreSQL as the durable backend and sync reconciling in the background when you are online.

## What you can do

- **General workspace** — Notes that are not in a folder live in “General”; use **Inbox** for quick capture before you file them.
- **Projects** — Each project is a **strict context boundary**: notes belong to one project or General. That boundary is meant to drive search, exports, and **local AI / RAG** so one project’s content is not blended into another while you work.
- **Rich notes** — TipTap-based editor (formatting, tasks, links, mentions, slash commands, etc.).
- **Note graph** — `[[wikilink]]`-style edges between notes, constrained to the same project (or both in General) so the graph stays coherent with your silos.
- **Lists & tables** — Structured views on top of your data where the app exposes them.
- **Local AI** — Summaries, titles, tags, and similar assists using models like **Gemma 8B** in the browser; the UI is designed to feel like a light “ghost” assist rather than a chat-first product.
- **Settings** — Account and local AI onboarding (model download, WebGPU readiness).
- **Notifications** — In-app notices; admins can manage campaigns from the admin area.
- **Auth** — Sign in with **GitHub** (Auth.js + Drizzle adapter). **Admin** features include user management, AI personas configuration, and notification tooling.

Device-local habit/telemetry data is intentionally **not** synced to the server (see project rules in the repo).

## Tech stack

| Area | Choice |
|------|--------|
| App framework | [SvelteKit](https://kit.svelte.dev/) (Svelte 5 runes) |
| UI | Tailwind CSS, [shadcn-svelte](https://www.shadcn-svelte.com/), [bits-ui](https://bits-ui.com/) |
| Editor | [TipTap](https://tiptap.dev/) |
| Database | PostgreSQL, [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Auth.js](https://authjs.dev/) (`@auth/sveltekit`) + GitHub OAuth |
| Local inference | [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) (WebGPU) |
| Embeddings / transformers (where used) | [@xenova/transformers](https://github.com/xenova/transformers.js) |

Client sync (PowerSync / ElectricSQL) and bucket rules are part of the long-term architecture; server schema and sync rules in-repo are the source of truth for how data is partitioned by `owner_id` and `project_id`.

## Repository map

| Path | Purpose |
|------|---------|
| `src/lib/server/db/schema.ts` | Drizzle schema: users, projects, notes, note links, notifications, etc. |
| `src/lib/workspace/active-project-api.ts` | Active project vs General — use this to scope AI and UI context. |
| `powersync/sync-rules.yaml` | PowerSync bucket rules (owner + project boundaries). |
| `src/auth.ts` | Auth.js configuration (GitHub provider, Drizzle adapter). |

## Prerequisites

- [Bun](https://bun.sh/) (lockfile is `bun.lock`)
- PostgreSQL reachable from your machine
- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) for local sign-in (callback URL must match your dev origin, e.g. `http://localhost:5173/api/auth/callback/github`)

## Environment variables

Create a `.env` in the project root (this file is gitignored). Typical variables:

| Variable | Required for | Notes |
|----------|----------------|-------|
| `DATABASE_URL` | App + Drizzle | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | Sign-in | GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | Sign-in | GitHub OAuth app |
| `AUTH_SECRET` | Sessions + admin impersonation | Strong random string; Auth.js uses it for signing |

If Auth.js warns about host trust in non-local deployments, set the variables your Auth.js / SvelteKit version expects (e.g. `AUTH_TRUST_HOST` / `AUTH_URL`) per [Auth.js deployment docs](https://authjs.dev/getting-started/deployment).

## Setup

```sh
bun install
```

Apply the database schema (pick the workflow you use in this repo):

```sh
# Push schema to the DB (good for local dev when you accept Drizzle pushing)
bun run db:push

# Or generate and run migrations
bun run db:generate
bun run db:migrate
```

Start the dev server:

```sh
bun run dev
```

Open the URL Vite prints (commonly `http://localhost:5173`), sign in with GitHub, and use **General**, **Projects**, **Inbox**, and **Settings** from the shell.

### Useful scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Vite dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |
| `bun run check` | `svelte-check` + sync |
| `bun run db:studio` | Drizzle Studio (inspect DB) |
| `bun run db:generate` / `db:migrate` / `db:push` | Drizzle migrations |

## Philosophy (for contributors)

When you add features, ask:

1. Does it respect **project silos** (no accidental cross-project AI or links where the product forbids them)?
2. Does it respect **local-first** UX (can the user still work with reasonable behavior offline)?
3. Does **local vs synced** state stay clear where it affects trust?

The detailed mental model lives in `.cursorrules` in this repository; prefer it over generic patterns when they conflict.

## License

No `LICENSE` file is present in the repository root; add one if you intend to publish or redistribute the code.
