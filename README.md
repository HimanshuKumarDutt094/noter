# Noter — your offline-first note app

This README is for people who will use or work on this repo. No marketing copy — just the facts.

TL;DR

- Noter stores notes. Notes can be linked to projects and categories, have tags, and can be pinned or archived.
- Data lives locally in the browser using Electric SQL's pglite (IndexedDB). TanStack DB is used for queries and live collections.
- React Router handles navigation. UI follows Shadcn/Radix + Tailwind patterns.
- A `public/manifest.json` is included so you can install the app as a PWA. After first load the app works offline for normal note workflows.

What the code actually does

- Notes schema: `src/collections/notes.ts` — notes have `projectIds`, `categoryIds`, `tagIds`, `isPinned`, `isArchived`, timestamps.
- Projects: `src/collections/projects.ts` — projects have `name`, `excerpt`, `color`, `categoryIds`.
- Categories & Tags: `src/collections/categories.ts` — categories and tags can optionally be scoped to a `projectId`.
- DB wiring: `src/lib/db.ts` — base collections use `indexdbCollectionOptions` (pglite/IndexedDB) and the app then exposes `liveQueryCollectionOptions` views for lists like all notes, pinned notes, archived notes, notes-by-project, etc.
- Query helpers: `getNotesByProjects(projectIds[])` returns a live collection that matches notes referencing any provided project IDs (supports legacy single `projectId` field and new `projectIds` arrays).

How storage works (short)

- Base storage: IndexedDB via pglite (the repo provides collection options so it can be wired to Postgres/Electric SQL if you add a server).
- TanStack DB is used for building queries/mutations and live query collections. UI code consumes these live collections (so lists update automatically).

Main UI features (what users see)

- Notes list, sort by updated time
- Project list (alphabetical)
- Filters: by project(s), by category, by tag; pin/unpin notes
- Tag input with suggestions and quick creation
- Note editor / dialog with tags, projects, categories

Run locally

```bash
pnpm install
pnpm dev
```

Build

```bash
pnpm build
pnpm preview
```

Where to look when changing code

- `src/lib/db.ts` — add or change live-query collections here.
- `src/collections/*.ts` — data schemas. If you change shapes, write a migration.
- `src/components/notes/` — UI for note list, editor, tag input and filters.
- `src/components/ui/` — shared UI building blocks (selects, multi-selects, inputs).
- `src/routes/` — routing using React Router.

PWA / offline notes

- `public/manifest.json` is in the repo and linked from `index.html`.
- The app stores all user data locally — after loading the page the app will continue to work without network access. If you want full offline reloads (service-worker caching), I can scaffold a service worker (Workbox or Vite plugin).

Notes for contributors (plain)

- Use `createCollection(indexdbCollectionOptions(...))` for base persistence and `liveQueryCollectionOptions(...)` for UI lists.
- Keep collection schemas stable. If you change a schema, add migration steps in `src/lib/db` or a migrations file.
- Prefer the live collections for UI so the UI reacts to changes automatically.

Want examples or migrations?

- I can add small examples showing how to query notes by project or tag with TanStack DB, and a sample migration script for schema changes.

## Noter — your offline-first note app

Noter is an offline-first note app built with React + TypeScript and Vite. It uses React Router for client routing, Shadcn UI components (Radix + Tailwind-based patterns), and TanStack DB with Electric SQL (pglite) for local/offline persistence.

This repo ships as a single-page app that, once loaded, requires zero network requests for normal note-taking workflows (no auth or external APIs by default). A web manifest is included so the app can be installed as a PWA.

### Key technologies

- React 19 + TypeScript
- Vite (dev + build)
- React Router for routing and SEO-friendly client routes
- Shadcn UI / Radix primitives for accessible components
- Tailwind CSS for styling
- @tanstack/react-db + @electric-sql/pglite for local DB collections

### PWA / Offline

- A `public/manifest.json` is included and linked from `index.html`.
- The app is designed to be fully usable offline after initial load — all data persists locally using pglite/TanStack DB collections.

### SEO with React Router

Because this is a client-side React Router app, you can improve discoverability by providing descriptive document titles and meta descriptions per route. The current `index.html` includes a default title and description; consider using a small head manager (or server-side rendering) if you need crawler-friendly server-rendered HTML for public pages.

## Getting started

Install dependencies:

```bash
pnpm install
```

Run dev server:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Preview:

```bash
pnpm preview
```
