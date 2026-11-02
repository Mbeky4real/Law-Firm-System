import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../app-core.html', import.meta.url), 'utf8');
assert.match(source, /_invPaymentCtx=\{invoiceId:_invActiveId,total,subtotal,currentCash,currentWht,outstandingBefore\}/);
assert.match(source, /p_invoice_id:_invPaymentCtx\.invoiceId/);
console.log('Invoice payment context UUID contract: PASS');
