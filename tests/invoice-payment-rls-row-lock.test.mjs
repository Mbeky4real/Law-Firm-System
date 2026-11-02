import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../migrations/20261103_invoice_payment_rls_row_lock.sql', import.meta.url),
  'utf8'
);

// Keep the RPC executable with a tightly scoped definer context.
assert.match(migration, /ALTER FUNCTION public\.record_invoice_payment\([\s\S]*?\) SECURITY DEFINER;/);
assert.match(migration, /ALTER FUNCTION public\.record_invoice_payment\([\s\S]*?\) SET search_path = '';/);

// The migration must document that authorization is enforced inside the RPC.
assert.match(migration, /Partner\/Admin auth\.uid\(\) role check/);
assert.match(migration, /restrictive client-side invoice RLS/);

// This migration must not weaken table policies or grant broad table access.
assert.doesNotMatch(migration, /CREATE POLICY|ALTER POLICY|GRANT\s+(ALL|UPDATE|SELECT)/i);
console.log('Invoice payment RLS row-lock migration contract: PASS');
