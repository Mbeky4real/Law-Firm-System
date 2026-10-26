# MOLMS Stability Cleanup Audit
Date: 2026-10-26
Branch: maintenance/stability-audit-20261026

## Scope and safety rule
This is a non-destructive audit baseline. Do not delete a runtime script solely because its name is old or its version number is low. The application is loaded through `index.html`, which fetches `app-core.html` into an iframe and injects multiple patch scripts. Runtime dependencies, inline handlers, database triggers/RLS, and module globals must be mapped before removing code.

## Confirmed risks observed
1. **Runtime patch accumulation.** `index.html` injects many module-specific patch scripts in addition to `app-core.html`. This increases ordering and compatibility risk. Each injected script needs an owner, purpose, test coverage, and a clear retirement condition.
2. **Overlapping budget approval handlers.** The runtime loads `budget-final-approval-v1.js`, `budget-final-approval-v8.js`, and `budget-approval-legacy-guard-v1.js`. V8 attaches a capturing click handler to `[data-bd-finalize]`; V1 also handles final approval; the legacy guard calls `window.bdFinalizeBudget`, while V8 exports `window.bdFinalizeBudgetV8`. These are overlapping implementations with an interface mismatch. Do not remove one until the canonical handler is selected and all button paths are verified.
3. **Multiple budget amount renderers.** `budget-dashboard-repair-v1.js` and `budget-approved-amount-v2.js` both add budget summary UI, with different scopes and source queries. Their outputs and mutation observers should be consolidated after checking whether both panels are intentionally required.
4. **Invoice and dashboard patch layering.** The entrypoint injects several invoice and financial-dashboard scripts. Their DOM mutations and cache-busting versions should be documented and tested for conflicts before consolidation.
5. **Line-item lookup defect.** The budget line-detail patch previously used the first visible budget reference in the whole budget page. It has been changed on this branch to prioritise the active document ID, with reference lookup as fallback. Production UI verification is still required.

## Required cleanup sequence
1. Inventory all files, scripts, inline handlers, and their entrypoint references; classify as active, duplicate/overlapping, unreferenced candidate, or unknown.
2. Identify one canonical implementation for each concern (budget final approval, budget totals, invoice identity/governance, dashboard cards).
3. Add smoke/regression checks for role enforcement, CRUD, approval state, invoice preview/print, budget item-to-line matching, financial totals, and mobile layout.
4. Remove only proven-unreferenced code in small commits; never delete data, migrations, audit history, or security policies as part of JS cleanup.
5. Deploy to preview first, test each module, then promote to production. Keep rollback commit and deployment ID.
6. Repeat a post-deployment smoke test against production.

## Verification status
- Branch created for isolated work: `maintenance/stability-audit-20261026`.
- This document records confirmed risks from files inspected; it is not a claim that every repository file has been audited.
- No production code was deleted as part of this audit baseline.
