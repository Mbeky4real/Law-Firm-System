# MOLMS Financial Dashboard Redesign — Audit and Test Plan

Status: audit/test planning only. This branch is not deployed. No production UI, database records, or live financial transactions have been changed.

## Approved direction

- Top row: two equal cards, Total Revenue and Total Expenses.
- Below: one full-width Cash Available After Expenses card.
- Revenue, expense, and cash reconciliation details expand inline.
- Remove Period Result from the main dashboard.
- Replace existing separate cash KPIs with the single cash card.
- Preserve existing records; do not repair totals by changing historical data.
- Critical expense policy: no expense from any other module, including Payroll, is included in Total Expenses until it has been manually recorded in Expenses Transactions.
- Cash Available is a separate cash-control figure and must reconcile against verified bank and office-cash balances, receipts, payments, and transfers. It must not use the expense card's recognition rule as a proxy for actual cash movement.

## Audit findings from current code and schema

### Current dashboard calculations

File: `js/financial-dashboard-v16.js`

1. `periodExpenses()` currently includes approved `fd_manual_transactions` with types expenditure/drawing, entries from closed `expense_registers`, locked `hr_payroll_runs`, and finalized payroll rows. This violates the new manual-record-only policy because payroll and expense-register records can feed Total Expenses without a matching Expenses Transactions entry.
2. Partner drawings are included in the same current expense total as operating expenditure. They must be separately classified; inclusion in cash movement does not automatically make them an operating expense.
3. `periodCashAvailable()` currently calculates selected-period cash collections minus `periodExpenses()`. It is not a verified cash balance and does not use configured opening balances or bank statement balances.
4. `cashPosition()` computes cumulative flows from invoice payment ledger and manual transaction data, but starts at zero, marks `openingBalanceConfigured:false`, does not reconcile to bank statement balances, and is not the same as a verified available balance.
5. `renderKpis()` currently renders six cards: Cash Available, Cash Received, New Receivables, Recognised Revenue, Operating Expenses, and Period Result. Its local grid is three columns; `js/financial-dashboard-simple-v1.js` also imposes a five-column layout. The redesign must have one clear owner for KPI layout to avoid CSS conflicts.
6. Invoice payment data distinguishes cash received from withholding tax. Withholding tax must not be represented as cash in bank.
7. Revenue currently derives from valid tax invoices and approved manual revenue rows. Duplicate invoice/manual receipts are partially suppressed in cash collections by date/currency/amount/client matching; this heuristic needs tests and must not be treated as definitive transaction linkage.

### Relevant database structures observed (read-only inspection)

- `fd_manual_transactions`: date, type, category, description, amount, currency, payment method, approval/status fields, counterparty and receipt/reference fields.
- `expense_registers` and `expense_entries`: register lifecycle/status, opening/closing balances, entry dates, amounts, categories, payment methods and entry statuses.
- `hr_payroll_runs`: payroll month, status, net payroll and total cost.
- `invoice_payments` and `invoices`: cash amount, withholding tax, payment date, estimated-date flag, invoice status, currency and invoice total.
- `firm_bank_accounts`: bank/account identity and currency, but no statement closing balance or bank statement reconciliation fields were found in the inspected columns.
- `office_expenses`: a separate expense source exists and must be checked for overlap and whether it is the same authoritative Expenses Transactions register.

No schema or data was changed during this audit.

## Required policy and calculation contract

### Total Revenue
- Use the agreed revenue recognition rules for the selected period.
- Include eligible invoice revenue and manually recorded direct income once only.
- Exclude draft, void, cancelled and superseded invoices.
- Keep currencies separate; never add TZS and USD into a single numeric total.
- Show recognised revenue separately from cash collected and receivables.
- Flag missing or inconsistent payment-ledger data.

### Total Expenses — manual record only
- Source of inclusion: eligible manually recorded rows in the designated Expenses Transactions register only.
- Payroll runs, payroll lines, office-expense records, closed expense registers, budgets and other modules are not direct inputs to this card.
- A payroll or other expense is included only after a corresponding manual expense transaction is entered and meets the agreed inclusion/status rule.
- Never auto-import, auto-post or infer a missing manual expense entry.
- Prevent duplicate entries using explicit reference/source linking where possible. Do not rely only on matching date and amount.
- Display partner drawings and loan principal separately from operating expenses. The owner must approve the final category presentation before implementation.
- Exclude cancelled/rejected entries; pending/draft entries should be shown as pending rather than included in the approved total.

### Cash Available After Expenses
- Must represent a verified cash position, not merely revenue minus expenses.
- Reconcile by currency: verified opening bank balances + verified opening office cash + actual cash receipts + actual cash inflows - actual cash payments - transfers out (with transfers between firm accounts eliminated at consolidated level), and compare with verified closing bank balances and counted office cash.
- WHT is not cash received in the bank. Record it separately as a settlement/receivable tax credit, according to the relevant tax workflow.
- The dashboard must not claim the figure is verified unless bank statement balances and office-cash count/balance are recorded and the reconciliation difference is zero or explicitly accepted under a controlled exception.
- The schema inspection found bank account identity records but no bank-statement balance/reconciliation columns. Determine whether another existing workflow stores these balances before proposing any schema addition. Do not add a schema migration without a separate review.
- If verified balance inputs are unavailable, display “Reconciliation pending” and show known ledger-derived movements separately; do not label the ledger estimate as verified cash available.

## Implementation and test plan (not yet implemented)

1. Map the actual UI save workflow and determine which table is the designated Expenses Transactions register. Confirm whether it is `fd_manual_transactions`, `office_expenses`, or a combination; do not assume they are interchangeable.
2. Trace every KPI data path and remove automatic expense inclusion from payroll, expense-register, office-expense, and other module sources unless a user manually records the expense in the designated register.
3. Separate operating expenses, drawings, loan principal repayments and other cash movements in presentation and calculations.
4. Design one KPI renderer and one responsive CSS owner. Desktop: two equal top cards; cash card spans both columns beneath. Tablet/mobile: responsive stack with no horizontal overflow.
5. Add inline expandable detail panels with traceable source records, category, date, currency, status and reference.
6. Design cash reconciliation using existing verified data sources first. If no bank statement / cash count inputs exist, propose the minimum additional workflow and obtain approval before schema changes.
7. Create a test-only version and run the regression matrix below. Do not merge to main, deploy, or modify live financial records.

## Regression test matrix

- Payroll run exists but no manual expense entry: Total Expenses remains unchanged.
- Payroll run exists and matching expense is manually recorded once: include exactly once.
- Expense exists in office-expenses/register module but not in Expenses Transactions: exclude from Total Expenses.
- Manual expense is pending/rejected/cancelled: exclude from approved total and show status as appropriate.
- Same expense manually entered twice: flag probable duplicate; do not silently delete or rewrite historical data.
- Drawing and loan repayment recorded: cash reconciliation reflects actual payment; Total Expenses classification remains separate according to approved policy.
- Invoice issued but unpaid: recognised revenue follows policy; cash available does not increase.
- Invoice paid partly in cash and partly by WHT: only cash amount increases bank/office cash; WHT is separate.
- Invoice payment and manual receipt represent same transaction: count cash once.
- Transfers between two firm bank accounts: do not count as revenue or expense; eliminate in consolidated cash position.
- Bank balances or office cash count missing / reconciliation difference nonzero: show reconciliation pending or exception, not verified.
- TZS and USD values: display separately.
- August, September and October 2026: compare old and proposed results, explain every variance, and preserve the underlying records.
- Desktop, tablet and mobile: no clipped labels, broken card sizing, or horizontal overflow.

## Release gate

No production deployment until the owner has reviewed the test version, reconciliation evidence, August–October variance report, and all regression results, then separately authorises deployment.
