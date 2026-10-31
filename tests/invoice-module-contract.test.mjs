import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../js/invoice-workflow-v3.js', import.meta.url), 'utf8');
const contract = readFileSync(new URL('../docs/INVOICE_MODULE_CONTRACT.md', import.meta.url), 'utf8');

assert.match(index, /molmsInvoiceWorkflowV10/,'The locked invoice runtime must be loaded.');
assert.match(index, /\/js\/invoice-workflow-v3\.js\?v=20261031d/,'The invoice runtime cache version must be explicit.');
assert.doesNotMatch(index, /invoice-governance-v1\.js/,'The legacy governance runtime must not be loaded alongside the current workflow.');
assert.match(workflow, /page-invoice/,'Actions must remain inside the original invoice workspace.');
assert.match(workflow, /molms-invoice-actions-footer-v7/,'There must be one bottom action area.');
assert.doesNotMatch(workflow, /Invoice Preparation & Issuance/,'Do not reintroduce the separate preparation card.');
assert.match(workflow, /\.eq\('user_id',user\.id\)\.eq\('active',true\)/,'Identity must resolve from the active role row.');
assert.match(workflow, /selectedInvoiceId\|\|activeId/,'Actions must prefer a stable invoice UUID.');
assert.match(workflow, /rpc\('submit_invoice_for_issuance'/,'Office Manager submission must use its protected RPC.');
assert.match(workflow, /rpc\('issue_submitted_invoice'/,'Issuance must use its protected RPC.');
assert.match(workflow, /rpc\('return_invoice_for_correction'/,'Returns must use their protected RPC.');
assert.match(workflow, /rpc\('void_issued_invoice'/,'Voiding must use its protected RPC.');
assert.doesNotMatch(workflow, /from\('invoices'\)\.update\(\{\s*status\s*:/,'The client must not directly update invoice status.');
assert.match(contract, /Non-negotiable workspace design/);
assert.match(contract, /Change control \/ regression prevention/);

console.log('MOLMS invoice module contract: PASS');
