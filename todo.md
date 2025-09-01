# Project TODOs

- [x] Fix MissingHandlerError by mutating base collections instead of live query collections for projects (db-fix-projects-mutations)
- [x] Refactor DB helpers: add pure filter utilities (project/category/tag/text) and legacy-safe matchers (refactor-db-helpers-filters)
- [x] Update TanStack DB queries: add getNotesByProjects(projectIds[]) and keep legacy getNotesByProject (db-queries-multi-projects)
- [x] Projects UI: Implement ProjectsList and ProjectDialog (create/edit) using Shadcn (ui-projects-list-dialog)
- [x] ProjectNotesPanel with scoped filters (tags/categories/project) (ui-project-notes-panel)
- [x] NoteEditor: support multi-project and multi-category selection (ui-note-editor-multi-relations)
  - [x] Update NoteDialog to support multi-select projects and categories using Shadcn components
  - [x] Ensure save/update uses baseNotesCollection and writes arrays (projectIds/categoryIds)
  - [x] Backfill handling for legacy single fields (projectId/categoryId) via filter utils
- [x] Note cloning/move between projects with optional carry-over of categories/tags (notes-clone-move-between-projects)
- [x] Combined filters in NoteList using shared filter utils (ui-notelist-combined-filters)
- [ ] Color coding utilities and application across UI (ui-color-coding)
  - [x] Add strict color types and readonly palette in `src/lib/colors.ts`
  - [x] Create shared `ColorPicker` component using Shadcn in `src/components/shared/ColorPicker.tsx`
  - [x] Integrate `ColorPicker` into `ProjectDialog` (replace native color input)
  - [x] Integrate `ColorPicker` into `CategorySelector` create flow
  - [ ] Apply consistent color usage across UI (NoteCard accents, badges, category/tag chips)
- [ ] Data migration: transform legacy fields to arrays and version storage (data-migration-arrays-versioning)
