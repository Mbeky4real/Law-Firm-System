# MOLMS Invoice Module — Locked Design Contract

**Status:** Locked baseline, effective 31 October 2026.  
**Scope:** Invoice module layout, role permissions, issuance, voiding and regression controls.

## Non-negotiable workspace design
1. Preserve the original single Invoice workspace and its existing invoice form, saved-invoices list and invoice preview.
2. Every generated invoice remains in the existing saved-invoices list, regardless of draft, pending, issued, paid or void status. Status is shown on the row.
3. Do not add separate workflow dashboards, preparation cards, duplicate invoice lists, queues or extra panels.
4. Show one compact role-based **Invoice Actions** area at the bottom of the existing Invoice workspace. It acts on the invoice selected in the existing saved-invoices list or the active invoice in the original form.
5. The invoice preview and original form remain the source of truth for invoice content. The workflow action area must not create or duplicate invoice data.

## Role permissions
- **Office Manager / Office Admin:** create invoices; save as draft; edit draft or returned draft; submit a saved draft to Partners. Never issue or void.
- **Partner / Admin:** review and issue saved drafts, submitted drafts or returned drafts; return a pending invoice with a reason; void an unpaid issued invoice with a reason.
- The database, not button visibility, enforces every permission.

## State transitions
- New invoice -> `draft`.
- Office Manager submission -> `pending`.
- Partner return -> `returned`.
- Partner/Admin issue -> `issued` (from `draft`, `pending` or `returned`).
- Partner/Admin void -> `void` (only an issued invoice with no payment/WHT ledger entries).
- Paid or WHT-affected invoices are not voided; use the approved credit-note/payment-reversal process.
- Never hard-delete invoices, invoice lines, payments or issuance events.

## Identity and record-selection contract
- Resolve the authenticated user from the Supabase session.
- Resolve exactly one active `public.roles` row for that user; inactive rows must not interfere with identity resolution.
- The database enforces one role row per non-null `user_id`.
- Prefer the selected invoice UUID (or original form's active invoice UUID) for every workflow action. Invoice number is a display/reference fallback only.
- Never infer that an invoice is saved merely because a number is present in the form.
- Every action calls its dedicated database RPC. No client-side direct status update is permitted.

## Change control / regression prevention
- Any change to the invoice layout or state transitions requires explicit approval from the firm.
- Pull requests touching `index.html`, `js/invoice-workflow-v3.js`, invoice schema, RLS policies or invoice RPCs must pass `node tests/invoice-module-contract.test.mjs`.
- The test is a guardrail, not a substitute for a Partner and Office Manager authenticated browser test.
- Do not add another invoice card, queue or workflow panel to solve a defect. Fix the existing workspace and action area.
