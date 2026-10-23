# Financial Dashboard Redesign — Preview Test Results

Date: 23 October 2026  
Branch: `audit/financial-dashboard-redesign`  
Status: Preview build ready; production not changed.

## Changes implemented on the isolated branch

- Replaced the six-KPI dashboard row with three executive cards:
  1. Total Revenue
  2. Total Expenses
  3. Cash Available After Expenses (full-width)
- Removed Period Result, Cash Received, and New Receivables from the main KPI row. Existing receivables and other detail modules remain separate.
- Added expandable revenue-source and expense-category breakdowns.
- Total Expenses now includes only approved `fd_manual_transactions` rows with `tx_type = 'expenditure'` in the selected period. It does not automatically add payroll runs, payroll lines, office-expense records, or expense-register entries. Drawings are excluded because they are not operating expense entries.
- Cash Available After Expenses displays **Reconciliation pending** rather than an unverified numeric amount. The inspected schema does not expose verified closing bank-statement balances and counted office cash to this KPI. It must not imply a verified cash balance until these inputs can be reconciled.
- Updated responsive KPI styling and cache-busting references.
- No database schema or transaction data was changed.

## Automated checks

| Check | Result | Evidence |
|---|---|---|
| `node --check js/financial-dashboard-v16.js` | PASS | Node syntax check exited 0 |
| `node --check js/financial-dashboard-simple-v1.js` | PASS | Node syntax check exited 0 |
| Vercel preview build | PASS | Deployment state READY for commit `c8b2b3cb0a8da5470416661617f5529766b35007` |
| Production unchanged | PASS | Preview deployment target is not production; main branch untouched |
| Live interactive/browser test against authenticated firm data | NOT RUN | Requires a real authenticated browser session and visual interaction testing |

Preview URL: https://law-firm-system-iypyht4g9-mbeky4real-8268s-projects.vercel.app/

## August–October 2026 expense comparison

The new Total Expenses card uses only approved manual expenditure rows in `fd_manual_transactions`. Amounts below come from read-only database queries. Currency totals remain separate.

| Period | New Total Expenses | Known sources included by the previous logic | Main reason for difference |
|---|---:|---:|---|
| August 2026 | TZS 5,278,000 | TZS 6,028,000 from manual expenditure plus a locked payroll run of TZS 750,000 | Removes payroll that was not manually recorded as a matching expense entry |
| September 2026 | TZS 500,000 | TZS 14,234,000 from manual expenditure/drawings, closed expense register TZS 684,000, and locked payroll TZS 1,050,000 | Excludes TZS 12,000,000 partner drawings, TZS 684,000 closed register entries and TZS 1,050,000 payroll run |
| October 2026 | TZS 3,750,000 and USD 1,200 | TZS 8,262,000 and USD 2,000 from manual expenditure/drawings; open register entries were excluded previously | Excludes TZS 4,512,000 drawings and USD 800 drawings |

**Interpretation note:** the “previous logic” figures above are a component-based comparison of known sources, not certified historical dashboard totals. The prior script also reads legacy payroll rows and may apply duplicate-suppression logic depending on those rows. Exact old-versus-new KPI variance should be confirmed in the authenticated preview before release. Open October expense-register entries (currently reported as TZS 619,000 in 22 rows) are intentionally not included unless manually recorded in Expenses Transactions.

## Regression policy checks

- Payroll without a manual expenditure transaction: excluded from Total Expenses by code path.
- Closed/open expense-register rows without a manual expenditure transaction: excluded from Total Expenses by code path.
- Office-expense module rows without a manual expenditure transaction: excluded from Total Expenses by code path.
- Approved manual expenditure: included once per source row.
- Partner drawings (`tx_type = drawing`): excluded from Total Expenses.
- Draft/pending/rejected/cancelled manual transactions: excluded unless the row resolves to approved status under the existing approval helper.
- Currency handling: totals rendered separately by currency.
- Cash reconciliation missing: card explicitly says “Reconciliation pending.”
- Category breakdown: computed from the same eligible manual expense rows as the KPI.
- UI responsiveness, category expansion, and authenticated data rendering: requires hands-on browser confirmation before release.

## Remaining blockers before production approval

1. Verify the preview in an authenticated browser on desktop, tablet and mobile.
2. Confirm that `fd_manual_transactions` is the exact authoritative “Expenses Transactions” workflow intended by the office, including how users enter salary, rent, office costs and loan payments.
3. Review the category treatment of loan repayments. They are currently included if manually entered as approved `expenditure`; the dashboard does not automatically reclassify them.
4. Provide or identify verified bank statement balances and counted office cash. Until then, a numeric verified cash-available balance cannot responsibly be shown.
5. Run the August–October comparisons against the actual authenticated preview KPI values and document any residual differences.
6. Obtain explicit approval before merging to `main` or deploying to production.
