import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../js/finance-refresh-coordinator-v1.js', import.meta.url), 'utf8');
const register = fs.readFileSync(new URL('../js/financial-invoice-register-repair-v1.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const name of ['invSaveDraft','invIssueInvoice','invSubmitPayment','invVoidInvoice','invDeleteDraft']) {
  assert.ok(source.includes("'" + name + "'"), 'Missing mutation hook: ' + name);
}
assert.match(source, /MOLMSInvoiceRegisterRepairV1\.refresh/);
assert.match(source, /MOLMSReceivablesRecoveryV1\.refresh/);
assert.match(source, /invLoadSavedList/);
assert.match(source, /window\.fdRefresh/);
assert.match(register, /MOLMSInvoiceRegisterRepairV1\.refresh=run/);
assert.match(shell, /molmsFinanceRefreshCoordinatorV1/);
console.log('MOLMS finance refresh workflow contract: PASS');
