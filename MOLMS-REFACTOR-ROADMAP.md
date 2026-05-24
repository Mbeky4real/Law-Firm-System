# MOLMS Refactor Roadmap

## Current Stable Modules

### js/ui.js
- esc()
- $()
- val()
- clear()

### js/storage.js
- write()
- read()

### js/constants.js
- LS storage keys

### js/utils.js
- today()
- searchText()

---

# Current System Status

## Stable
- Supabase connection
- Authentication
- Dashboard loading
- Reports
- Diary
- Basic rendering
- Role rendering
- Backup workflow
- Rollback workflow
- Vercel deployment

## Needs Stabilization
- Cause List rendering consistency
- NonLit rendering consistency
- Runtime module loading
- Shared renderer normalization

---

# Planned Future Modules

## UI Layer
- ui.js

## Storage Layer
- storage.js

## Config Layer
- constants.js

## Utility Layer
- utils.js

## Data Layer
- supabase.js

## Rendering Layer
- renderers.js

## Feature Modules
- cases.js
- nonlit.js
- diary.js
- reports.js
- docs.js
- chat.js

---

# Refactor Rules

1. Backup before major edits
2. Commit after every stable milestone
3. Never remove inline logic before testing module replacement
4. Extract pure helpers first
5. Avoid renderer edits without rollback point
6. Test after every runtime change
7. Prefer incremental stabilization over massive rewrites

---

# Current Priority

1. Stabilize rendering consistency
2. Continue safe modular extraction
3. Improve runtime module loading safely
4. Separate renderers later
5. Separate Supabase logic later
