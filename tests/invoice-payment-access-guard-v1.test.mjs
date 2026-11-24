import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../js/invoice-payment-access-guard-v1.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(source,/authRole==='partner'\|\|authRole==='admin'/);
for(const name of ['invRecordPayment','invSubmitPayment','invLockForm','invLoadInvoice'])assert.ok(source.includes("'" + name + "'"));
assert.match(source,/invBtnRecordPayment/);
assert.match(shell,/molmsInvoicePaymentAccessGuardV1/);
console.log('MOLMS invoice payment UI access contract: PASS');
