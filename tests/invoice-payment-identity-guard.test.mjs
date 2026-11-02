import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../js/invoice-payment-identity-guard-v1.js', import.meta.url), 'utf8');
assert.match(source, /window\.invSubmitPayment = async function/);
assert.match(source, /ctx\.invoiceId = invoice\.id/);
assert.match(source, /eq\('invoice_number',formNumber\)/);
assert.match(source, /No payment was recorded/);
assert.doesNotMatch(source, /\.from\('invoice_payments'\)\.insert|\.from\('invoices'\)\.update/);
console.log('Invoice payment identity guard contract: PASS');
