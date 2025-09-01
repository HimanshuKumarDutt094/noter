# Notes App — Unified Home (Notes | Projects)

This plan replaces the previous document. Goal: a coherent, high‑quality app with a single Home that has two views: Normal (Notes) and Projects. Notes can belong to multiple projects and multiple categories. Projects can have scoped categories/tags. Copying a note into another project brings its categories/tags into that project if opted. Clear Shadcn UI, strict TypeScript, and TanStack DB queries for data, minimal local state.

## 1) Core User Journeys

1. Create, edit, pin, archive notes (Markdown later).
2. Assign notes to multiple projects and categories; add tags.
3. View Home with two tabs: Notes and Projects.
   - Notes: list/grid, filters by text + tags + categories + projects (combined).
   - Projects: browse projects, color‑coded cards with optional excerpt; open a project panel showing its notes and filters.
4. Clone/move note to another project.
   - If the project uses scoped categories/tags, optionally import missing categories/tags for that note into the project.
5. Import/export notes and projects (JSON first; Markdown later).

## 2) Data Model (backward‑compatible migration phase)

Types are Zod schemas stored in IndexedDB via TanStack DB.

- Note
  - id: string
  - title: string
  - content: string
  - color?: string
  - projectIds: string[]   // NEW (multi‑project)
  - categoryIds: string[]  // NEW (multi‑category)
  - tagIds: string[]
  - isArchived: boolean
  - isPinned: boolean
  - createdAt: ISO string
  - updatedAt: ISO string
  - Legacy (temporary): projectId?, categoryId? for migration only

- Project
  - id: string
  - name: string
  - description?: string
  - excerpt?: string       // NEW (short summary)
  - color?: string
  - createdAt: ISO string
  - updatedAt: ISO string
  - categoryIds?: string[] // Optional linkage to project‑scoped categories

- Category
  - id: string
  - name: string
  - color: string
  - projectId?: string     // NEW (optional scoping)
  - createdAt, updatedAt: ISO string

- Tag
  - id: string
  - name: string
  - color: string
  - projectId?: string     // NEW (optional scoping)
  - createdAt, updatedAt: ISO string

Migration strategy
- Keep legacy `note.projectId` and `note.categoryId` temporarily.
- Add `projectIds` and `categoryIds` with defaults [].
- One‑time upgrader: if legacy fields exist, push into arrays and clear legacy.

## 3) Architecture

- HomePage (new): tabs using Shadcn Tabs: Notes | Projects.
- Notes view uses existing `NotesPage` content but gains combined filters and multi‑assignment UI.
- Projects view: `ProjectsPage` lists projects with `ProjectCard`; clicking opens `ProjectNotesPanel` inside the page.
- Remove dedicated project routes; everything flows through Home.
- Components kept small and typed. No `any`.

## 4) UI

- Shadcn UI for all primitives.
- Color coding across projects, categories, and notes.
- Filters pill bar + Selects for project/category; tag chips; text search. All combinable.
- ProjectCard shows color, name, optional excerpt, note count, created date.

## 5) Implementation Phases

Phase A — Schemas + DB (compatible)
- Add `projectIds[]`, `categoryIds[]` in Note.
- Add `excerpt?`, `categoryIds?` in Project.
- Add `projectId?` in Category and Tag.
- Keep legacy fields for now. Write migration helper.

Phase B — Home + Routing
- Create `HomePage` with Tabs (Notes | Projects). Make `/` render Home.
- Remove `/projects*` routes.

Phase C — Projects View
- `ProjectsPage` with `ProjectsList` + `ProjectCard` + `ProjectDialog` (create/edit).
- `ProjectNotesPanel` showing notes scoped by project, with filters.

Phase D — Notes Enhancements
- Update NoteEditor for multi‑project and multi‑category selectors.
- Note cloning/move flow with carry‑over of categories/tags when opting in.
- Combined filters in `NoteList`.

Phase E — Import/Export
- JSON import/export for projects and notes (with relationships).
- Later: Markdown.

Phase F — Polish
- Keyboard shortcuts, drag & drop, responsive tweaks, perf.

## 6) Testing
- Unit: schema migration, query helpers, clone behavior.
- Integration: create -> assign -> clone -> filter -> export/import.

## 7) Tech
- React 18, React Router v7 (minimal usage), TanStack DB, Zod, Tailwind, Shadcn UI.

