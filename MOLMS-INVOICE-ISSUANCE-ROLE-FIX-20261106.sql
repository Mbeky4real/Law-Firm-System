-- MOLMS invoice issuance authorization consistency fix
-- The database workflow RPC permits active Partner/Admin users. The issuance
-- identity trigger must enforce the same rule and persist the authenticated
-- issuer identity for both authorised roles.
CREATE OR REPLACE FUNCTION private.enforce_invoice_issuance_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  actor_role text;
BEGIN
  SELECT lower(coalesce(r.role,'')) INTO actor_role
  FROM public.roles r
  WHERE r.user_id=(SELECT auth.uid())
    AND r.active IS TRUE
  LIMIT 1;

  IF NEW.status='draft' THEN
    NEW.issued_by := NULL;
    NEW.issued_at := NULL;
  ELSIF NEW.status='issued' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'issued') THEN
    IF actor_role NOT IN ('partner','admin') THEN
      RAISE EXCEPTION 'Only a Partner or Admin may issue an invoice';
    END IF;
    NEW.issued_by := (SELECT auth.uid());
    NEW.issued_at := coalesce(NEW.issued_at,now());
  END IF;

  IF TG_OP='UPDATE' AND OLD.status='issued' THEN
    IF NEW.issued_by IS DISTINCT FROM OLD.issued_by THEN
      RAISE EXCEPTION 'The issuing Partner/Admin signatory of an issued invoice cannot be changed';
    END IF;
    NEW.issued_at := OLD.issued_at;
  END IF;

  RETURN NEW;
END;
$function$;
