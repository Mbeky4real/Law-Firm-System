-- MOLMS Phase 1 database security hardening
-- Prepared against the inspected molms-production schema on 2026-11-24.
-- Apply only after a verified database backup and staging validation.
-- This migration preserves existing audit rows and existing business data.

begin;

-- 1. Secure the audit-log parent and every existing partition.
-- Administrators retain SELECT through the existing parent-table RLS policy.
revoke all privileges on table public.audit_logs from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.audit_logs from authenticated;
grant select on table public.audit_logs to authenticated;

alter table public.audit_logs_2026_q1 enable row level security;
alter table public.audit_logs_2026_q2 enable row level security;
alter table public.audit_logs_2026_q3 enable row level security;
alter table public.audit_logs_2026_q4 enable row level security;
alter table public.audit_logs_2027 enable row level security;
alter table public.audit_logs_2028_onwards enable row level security;

revoke all privileges on table public.audit_logs_2026_q1 from public, anon, authenticated;
revoke all privileges on table public.audit_logs_2026_q2 from public, anon, authenticated;
revoke all privileges on table public.audit_logs_2026_q3 from public, anon, authenticated;
revoke all privileges on table public.audit_logs_2026_q4 from public, anon, authenticated;
revoke all privileges on table public.audit_logs_2027 from public, anon, authenticated;
revoke all privileges on table public.audit_logs_2028_onwards from public, anon, authenticated;

-- 2. Remove anonymous/public EXECUTE from every public SECURITY DEFINER function.
-- Trigger functions also lose direct authenticated EXECUTE; PostgreSQL triggers
-- continue to invoke them through their registered trigger bindings.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature,
           exists (
             select 1 from pg_trigger t
             where t.tgfoid = p.oid and not t.tgisinternal
           ) as is_trigger_function
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon', r.signature);
    if r.is_trigger_function then
      execute format('revoke execute on function %s from authenticated', r.signature);
    end if;
  end loop;

  -- This maintenance function is an administrative operation, not an API RPC.
  revoke execute on function public.fn_maintain_audit_log_partitions() from public, anon, authenticated;
end
$$;

-- 3. Harden SECURITY DEFINER search paths against object-shadowing.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('alter function %s set search_path = pg_catalog, public', r.signature);
  end loop;
end
$$;

-- 4. Prevent a signed-in user from changing their own role.
-- Other self-service profile updates remain available under users_update_own.
create or replace function public.fn_prevent_self_role_escalation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is not null
     and old.id = auth.uid()
     and new.role is distinct from old.role
     and public.get_user_role() is distinct from 'administrator' then
    raise exception 'Users cannot change their own system role.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_prevent_self_role_escalation on public.users;
create trigger trg_prevent_self_role_escalation
before update of role on public.users
for each row
execute function public.fn_prevent_self_role_escalation();

drop policy if exists users_update_admin on public.users;
create policy users_update_admin
on public.users
for update
to authenticated
using (public.get_user_role() = 'administrator')
with check (public.get_user_role() = 'administrator');

drop policy if exists users_update_own on public.users;
create policy users_update_own
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 5. Ensure caller identity cannot be spoofed through the actor UUID argument.
create or replace function public.fn_archive_matter_with_override(
  p_matter_id uuid,
  p_actor uuid,
  p_reason text,
  p_force_override boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_role text;
  v_unresolved_count integer;
  v_unresolved_list text;
begin
  if auth.uid() is null or p_actor is distinct from auth.uid() then
    raise exception 'The supplied actor must match the authenticated user.';
  end if;

  select role::text into v_actor_role
  from public.users
  where id = auth.uid();

  if v_actor_role is null or v_actor_role not in ('administrator', 'partner') then
    raise exception 'Only Partners and Administrators may archive a matter (actor role: %)',
      coalesce(v_actor_role, 'unknown');
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'An archive reason is required.';
  end if;

  select count(*), string_agg(to_char(hearing_date, 'DD Mon YYYY'), ', ')
  into v_unresolved_count, v_unresolved_list
  from public.matter_hearings
  where matter_id = p_matter_id
    and is_archived = false
    and outcome is null
    and hearing_date < now();

  if v_unresolved_count > 0 and not p_force_override then
    raise exception
      'Cannot archive matter: % unresolved hearing(s) with no recorded outcome (%). Record the outcome first, or confirm the override.',
      v_unresolved_count, v_unresolved_list
      using errcode = 'P0001';
  end if;

  update public.matters
  set is_archived = true,
      archived_by = auth.uid(),
      archived_at = now(),
      archive_reason = case
        when v_unresolved_count > 0 then
          p_reason || ' [Archived with ' || v_unresolved_count ||
          ' unresolved hearing(s) overridden by ' || v_actor_role || ']'
        else p_reason
      end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_matter_id;
end;
$function$;

create or replace function public.fn_matter_reassign(
  p_matter_id uuid,
  p_user_id uuid,
  p_actor uuid,
  p_reason text default 'Reassignment'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_new_id uuid;
  v_matter_ref text;
  v_old_user_name text;
  v_new_user_name text;
  v_actor_name text;
  v_actor_role text;
  v_matter_creator uuid;
begin
  if auth.uid() is null or p_actor is distinct from auth.uid() then
    raise exception 'The supplied actor must match the authenticated user.';
  end if;

  select role::text into v_actor_role
  from public.users where id = auth.uid();

  select created_by into v_matter_creator
  from public.matters where id = p_matter_id;

  if v_actor_role is null or not (
    v_actor_role in ('administrator', 'partner')
    or (v_actor_role = 'member' and auth.uid() = v_matter_creator)
  ) then
    raise exception 'Not authorized to reassign this matter (actor role: %)',
      coalesce(v_actor_role, 'unknown');
  end if;

  update public.matter_assignments
  set archived_at = now()
  where matter_id = p_matter_id and archived_at is null;

  insert into public.matter_assignments (
    matter_id, assigned_to, assigned_by, assigned_at, reason
  ) values (
    p_matter_id, p_user_id, auth.uid(), now(), p_reason
  )
  returning id into v_new_id;

  update public.matters
  set assigned_to = p_user_id
  where id = p_matter_id
    and assigned_to is distinct from p_user_id;

  select reference_number into v_matter_ref
  from public.matters where id = p_matter_id;

  select name into v_new_user_name
  from public.users where id = p_user_id;

  select name into v_actor_name
  from public.users where id = auth.uid();

  v_actor_name := coalesce(v_actor_name, 'System');

  insert into public.audit_logs (
    action_type, module, target_table, target_id, target_label,
    performed_by, performed_at, before_snapshot, after_snapshot
  ) values (
    'RECORD_UPDATED',
    'cause_list',
    'matter_assignments',
    v_new_id,
    coalesce(v_matter_ref, p_matter_id::text),
    auth.uid(),
    now(),
    jsonb_build_object('matter_id', p_matter_id, 'event', 'reassignment_requested'),
    jsonb_build_object('matter_id', p_matter_id, 'new_assignment_id', v_new_id,
                       'assigned_to', p_user_id, 'reason', p_reason)
  );

  insert into public.activity_feed (
    event_type, module, actor_id, target_table, target_id, target_label,
    message, parent_matter_id
  ) values (
    'MATTER_ASSIGNED',
    'cause_list',
    auth.uid(),
    'matters',
    p_matter_id,
    coalesce(v_matter_ref, p_matter_id::text),
    v_actor_name || ' reassigned ' || coalesce(v_matter_ref, 'a matter') ||
      ' to ' || coalesce(v_new_user_name, 'a member'),
    p_matter_id
  );

  return v_new_id;
end;
$function$;

-- Prevent authenticated callers from forging the actor on notification records.
create or replace function public.fn_insert_notification(
  p_trigger_code text,
  p_recipient_id uuid,
  p_actor_id uuid,
  p_table text,
  p_target_id uuid,
  p_label text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_trigger_id uuid;
begin
  if auth.uid() is null or p_actor_id is distinct from auth.uid() then
    raise exception 'The supplied actor must match the authenticated user.';
  end if;

  select id into v_trigger_id
  from public.notification_triggers
  where trigger_code = p_trigger_code and is_active = true;

  if v_trigger_id is null then
    return;
  end if;

  if p_recipient_id is null or p_recipient_id = auth.uid() then
    return;
  end if;

  insert into public.notifications (
    trigger_id, recipient_id, actor_id,
    target_table, target_id, target_label, message
  ) values (
    v_trigger_id, p_recipient_id, auth.uid(),
    p_table, p_target_id, p_label, p_message
  );
end;
$function$;

-- 6. Future partition creation must not recreate the exposed-partition issue.
create or replace function public.fn_maintain_audit_log_partitions()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_next_year integer := extract(year from now())::integer + 1;
  v_next_year_start date := make_date(v_next_year, 1, 1);
  v_next_year_end date := make_date(v_next_year + 1, 1, 1);
  v_new_partition text := 'audit_logs_' || v_next_year::text;
  v_catchall_name text;
  v_catchall_to_text text;
  v_catchall_to_date date;
  v_far_future_text text;
  v_max_to_date date := null;
  r record;
begin
  if exists (
    select 1 from pg_class
    where relname = v_new_partition
      and relnamespace = 'public'::regnamespace
  ) then
    raise notice 'fn_maintain_audit_log_partitions: % already exists, skipping',
      v_new_partition;
    return;
  end if;

  for r in
    select c.relname as partname,
           pg_get_expr(c.relpartbound, c.oid) as bound_expr
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    where p.oid = 'public.audit_logs'::regclass
  loop
    v_catchall_to_text :=
      substring(r.bound_expr from 'TO \\(''([^'']+)''\\)');
    if v_catchall_to_text is null then
      continue;
    end if;

    v_catchall_to_date := v_catchall_to_text::timestamptz::date;

    if v_max_to_date is null or v_catchall_to_date > v_max_to_date then
      v_max_to_date := v_catchall_to_date;
      v_far_future_text := v_catchall_to_text;
      v_catchall_name := r.partname;
    end if;
  end loop;

  if v_catchall_name is null then
    raise warning 'fn_maintain_audit_log_partitions: could not identify a catch-all partition — nothing to split';
    return;
  end if;

  if v_max_to_date <= v_next_year_end then
    raise warning 'fn_maintain_audit_log_partitions: catch-all % upper bound % is not after %, skipping',
      v_catchall_name, v_max_to_date, v_next_year_end;
    return;
  end if;

  execute format('alter table public.audit_logs detach partition %I', v_catchall_name);

  execute format(
    'create table public.%I partition of public.audit_logs for values from (%L) to (%L)',
    v_new_partition, v_next_year_start, v_next_year_end
  );

  execute format('alter table public.%I enable row level security', v_new_partition);
  execute format(
    'revoke all privileges on table public.%I from public, anon, authenticated',
    v_new_partition
  );

  execute format(
    'alter table public.%I rename to %I',
    v_catchall_name, 'audit_logs_catchall_' || (v_next_year + 1)::text
  );

  execute format(
    'alter table public.%I enable row level security',
    'audit_logs_catchall_' || (v_next_year + 1)::text
  );
  execute format(
    'revoke all privileges on table public.%I from public, anon, authenticated',
    'audit_logs_catchall_' || (v_next_year + 1)::text
  );

  execute format(
    'alter table public.audit_logs attach partition public.%I for values from (%L) to (%L)',
    'audit_logs_catchall_' || (v_next_year + 1)::text,
    v_next_year_end,
    v_far_future_text
  );

  raise notice 'fn_maintain_audit_log_partitions: created %, secured catch-all partition',
    v_new_partition;
end;
$function$;

commit;

-- Post-apply verification must confirm:
-- * all six current partitions have relrowsecurity = true;
-- * anon has no table privileges on audit_logs or its partitions;
-- * authenticated can SELECT the parent only through its RLS policy;
-- * authenticated cannot directly access child partitions or execute trigger functions;
-- * get_user_role() remains executable by authenticated (RLS policy dependency);
-- * non-admin self-role changes fail while profile updates still work;
-- * matter archive/reassignment RPCs reject a forged p_actor UUID;
-- * audit triggers continue recording inserts/updates.
