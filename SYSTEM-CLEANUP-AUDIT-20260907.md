# MOLMS System Cleanup Audit — 7 September 2026

This audit removed obsolete one-shot patch infrastructure and stale repository snapshots while preserving the current production runtime and data architecture. Runtime code was not deleted merely because it is old; only clearly superseded maintenance machinery and repository backups were removed automatically.

## Removed artifacts

Total removed: **63**
- `.github/finance-dashboard-canonical-v15.trigger`
- `.github/invoice-architecture-v6.trigger`
- `.github/invoice-email-v7.trigger`
- `.github/maintenance/finance-dashboard-canonical-v15.py`
- `.github/patch-dashboard-payment-direct-v5.py`
- `.github/patch-expenditure-obligations-v6-safe.py`
- `.github/patch-expense-categories.py`
- `.github/patch-finance-carryforward-receivables.py`
- `.github/patch-finance-continuity-v2.py`
- `.github/patch-finance-dashboard-architecture-v2.py`
- `.github/patch-finance-hierarchy-v10.py`
- `.github/patch-finance-priority-clientmatter-v4.py`
- `.github/patch-finance-ui-v3.py`
- `.github/patch-firm-settings-master-profile.py`
- `.github/patch-invoice-architecture-v6.py`
- `.github/patch-invoice-email-v7.py`
- `.github/patch-invoice-payment-module-context.py`
- `.github/patch-invoice-payment-v2.py`
- `.github/patch-login-literal-newlines.py`
- `.github/patch-notification-watermarks-v1.py`
- `.github/patch-notification-watermarks-v1b.py`
- `.github/patch-obligations-layout-v7.py`
- `.github/patch-payment-router-v4.py`
- `.github/patch-payroll-selfservice.py`
- `.github/patch-receivables-client-matter-v1.py`
- `.github/patch-salaries-budget-summary-v12.py`
- `.github/restore-stable-sidebar.py`
- `.github/system-cleanup-v1.trigger`
- `.github/workflows/auth-emergency-hotfix.yml`
- `.github/workflows/finance-dashboard-canonical-v15.yml`
- `.github/workflows/invoice-architecture-v6.yml`
- `.github/workflows/invoice-email-v7.yml`
- `.github/workflows/patch-dashboard-payment-direct-v5.yml`
- `.github/workflows/patch-expenditure-obligations-v6-safe.yml`
- `.github/workflows/patch-expense-categories.yml`
- `.github/workflows/patch-finance-carryforward-receivables.yml`
- `.github/workflows/patch-finance-continuity-v2.yml`
- `.github/workflows/patch-finance-dashboard-architecture-v2.yml`
- `.github/workflows/patch-finance-priority-clientmatter-v4.yml`
- `.github/workflows/patch-finance-ui-v3.yml`
- `.github/workflows/patch-firm-settings-master-profile.yml`
- `.github/workflows/patch-invoice-payment-module-context.yml`
- `.github/workflows/patch-invoice-payment-v2.yml`
- `.github/workflows/patch-login-literal-newlines.yml`
- `.github/workflows/patch-notification-watermarks-v1.yml`
- `.github/workflows/patch-notification-watermarks-v1b.yml`
- `.github/workflows/patch-obligations-layout-v7.yml`
- `.github/workflows/patch-payment-router-v4.yml`
- `.github/workflows/patch-payroll-selfservice.yml`
- `.github/workflows/patch-receivables-client-matter-v1.yml`
- `.github/workflows/patch-salaries-budget-summary-v12.yml`
- `.github/workflows/refine-finance-hierarchy-v10.yml`
- `.github/workflows/refine-finance-hierarchy-v10b.yml`
- `.github/workflows/reintegrate-finance-sidebar-safe-v9.yml`
- `.github/workflows/reintegrate-finance-sidebar-safe-v9b.yml`
- `.github/workflows/restore-stable-sidebar.yml`
- `Create backup before BUG-020 dashboard activity fixes`
- `Create backup before Reports Phase 2 deployment`
- `MOLMS_v3_CRUD_Sorting.html`
- `MOLMS_v3_InterCom_PartialPass.html`
- `STABLE_REDEPLOY_20260905.txt`
- `back before fix causelist disappearing`
- `back up before hardening version`

## Static integrity scan
- Duplicate DOM IDs detected: **4**
  - `${r.id}` × 3
  - `adminOnly` × 2
  - `exReceiptsPlaceholder` × 2
  - `fdReceivablesCardV1` × 2
- Duplicate top-level-style function declarations detected: **3**
  - `invNewInvoice` × 2
  - `invPaymentRecalc` × 2
  - `invRenderSavedList` × 2
- Repeated MOLMS runtime markers detected: **3**
  - `MOLMS-FINANCE-CANONICAL-V15` × 2
  - `MOLMS-FINANCE-HIERARCHY-V10` × 2
  - `MOLMS-INVOICE-CANONICAL-V6` × 2
- Merge-conflict markers present: **no**

## Cleanup policy going forward
- Do not commit ad-hoc root-level backup copies of `index.html`; use a Git branch/tag instead.
- Do not leave one-shot patch workflows active after a successful production commit.
- Prefer editing canonical module code directly. If a temporary patch is unavoidable, retire its script/workflow immediately after consolidation.
- Treat duplicate IDs/functions reported above as review items, not automatic deletion targets, because some may be intentionally scoped or compatibility shims.
