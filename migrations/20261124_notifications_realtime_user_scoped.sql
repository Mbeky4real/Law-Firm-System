-- Add only the existing, RLS-protected per-user notifications table to Realtime.
-- Existing publication members are intentionally preserved.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'Expected publication supabase_realtime does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'notifications'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.oid AND i.indisprimary
      )
  ) THEN
    RAISE EXCEPTION 'public.notifications must be an RLS-enabled table with a primary key';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND cmd = 'SELECT'
      AND qual ILIKE '%recipient_user_id%'
      AND qual ILIKE '%auth.uid%'
  ) THEN
    RAISE EXCEPTION 'Expected recipient-scoped SELECT RLS policy on public.notifications was not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END
$migration$;
