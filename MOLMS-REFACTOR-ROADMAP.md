# MOLMS Refactor Roadmap

## Current Active Runtime Modules

- `js/time-format-v1.js` — system-wide 24-hour time formatting
- `js/document-module-v3.js` — Documents runtime
- `js/intercom-module-v3.js` — InterCom runtime
- `js/matter-timeline-inline-v1.js` — inline matter report timeline
- `js/diary-manual-events-v1.js` — manual Diary entries and matter-linked Diary work
- `js/calendar-professional-v1.js` — professional Diary calendar layout
- `js/calendar-holidays-v1.js` — Tanzania / international holiday layer
- `js/partner-drawings-expenditure-v1.js` — Partner Drawings manual expenditure refinement
- `js/manual-revenue-matter-picker-v1.js` — Cause List / Non-Lit matter picker for manual revenue

The earlier `ui.js`, `storage.js`, `constants.js`, and `utils.js` extraction scaffolds were retired because they were not loaded by the production shell and duplicated logic still owned by `app-core.html`.

---

## Current System Status

### Stable
- Supabase connection
- Authentication
- Dashboard loading
- Reports
- Diary
- Cause List and Non-Lit matter workflows
- Documents
- InterCom
- Finance runtime refinements
- Backup / rollback safeguards
- Vercel deployment

### Architectural debt
- `app-core.html` remains monolithic and should only be decomposed incrementally after equivalent runtime modules are tested.
- `index.html` remains the canonical same-origin shell and injects approved runtime modules into `app-core.html`.
- Do not reintroduce obsolete patch workflows or one-shot repository scripts.

---

## Refactor Rules

1. Create a rollback branch before material production changes.
2. Remove obsolete helpers only after confirming they are not loaded or referenced by production.
3. Never remove inline logic before a tested replacement exists.
4. Prefer small runtime modules over large one-shot patches.
5. Avoid broad renderer changes without a rollback point.
6. Verify Vercel deployment after production changes.
7. Keep the repository free of temporary patch scripts, inspection workflows, debug artifacts and obsolete release files.

---

## Current Priority

1. Preserve production stability.
2. Consolidate runtime refinements when multiple modules begin patching the same feature.
3. Continue reducing duplicate and dead code safely.
4. Decompose `app-core.html` only in tested, reversible stages.
