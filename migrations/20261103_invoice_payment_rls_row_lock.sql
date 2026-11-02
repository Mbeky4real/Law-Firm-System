-- MOLMS: allow the authorized invoice-payment RPC to lock issued invoices.
-- The RPC retains its explicit Partner/Admin auth.uid() role check.
-- SECURITY DEFINER is required because SELECT ... FOR UPDATE also requires
-- update privileges; the client-facing invoice UPDATE policy intentionally
-- restricts direct updates to draft/returned invoices.
ALTER FUNCTION public.record_invoice_payment(
  uuid, numeric, date, text, numeric, numeric, text
) SECURITY DEFINER;

ALTER FUNCTION public.record_invoice_payment(
  uuid, numeric, date, text, numeric, numeric, text
) SET search_path = '';

COMMENT ON FUNCTION public.record_invoice_payment(
  uuid, numeric, date, text, numeric, numeric, text
) IS
'Authorized Partner/Admin invoice payment RPC. Runs as function owner to perform row locking and ledger updates despite restrictive client-side invoice RLS; explicitly validates auth.uid() role before accessing invoice records.';
