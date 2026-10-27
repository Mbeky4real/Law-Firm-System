-- MOLMS InterCom urgent notification priority fix
-- Applied to Supabase project myjkthjgnmzabmuwprqp on 2026-10-27.
-- notifications_priority_check permits only 'normal' and 'urgent'.
-- The InterCom insert trigger previously emitted 'high' for urgent notices,
-- causing chat_messages inserts to fail when the trigger attempted notification creation.

CREATE OR REPLACE FUNCTION public.fn_notify_intercom_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_reply_author uuid;
  v_title text;
  v_preview text;
  v_sender_text text;
begin
  begin v_uid := new.sender_id::uuid; exception when others then v_uid := new.created_by; end;
  v_preview := left(coalesce(new.message,new.content,''), 160);

  insert into public.notifications (
    recipient_user_id,type,title,message,source_module,source_record_id,source_reference,action_target,priority,created_by
  )
  select distinct r.user_id,'INTERCOM_MENTION','You were mentioned in InterCom',v_preview,'intercom',new.id,new.category,'chat','normal',v_uid
  from public.roles r
  where r.active = true
    and r.user_id = any(coalesce(new.mentioned_user_ids,'{}'::uuid[]))
    and r.user_id is distinct from v_uid;

  if new.reply_to_id is not null then
    select cm.created_by, cm.sender_id
      into v_reply_author, v_sender_text
      from public.chat_messages cm
     where cm.id = new.reply_to_id;
    if v_reply_author is null and v_sender_text is not null then
      begin v_reply_author := v_sender_text::uuid; exception when others then v_reply_author := null; end;
    end if;
    if v_reply_author is not null
       and v_reply_author is distinct from v_uid
       and not (v_reply_author = any(coalesce(new.mentioned_user_ids,'{}'::uuid[]))) then
      insert into public.notifications (
        recipient_user_id,type,title,message,source_module,source_record_id,source_reference,action_target,priority,created_by
      ) values (
        v_reply_author,'INTERCOM_REPLY','New reply to your InterCom message',v_preview,'intercom',new.id,new.category,'chat','normal',v_uid
      );
    end if;
  end if;

  if new.category = 'Urgent' then
    insert into public.notifications (
      recipient_user_id,type,title,message,source_module,source_record_id,source_reference,action_target,priority,created_by
    )
    select r.user_id,'INTERCOM_URGENT','Urgent InterCom notice',v_preview,'intercom',new.id,new.category,'chat','urgent',v_uid
    from public.roles r
    where r.active = true and r.user_id is distinct from v_uid
      and not exists (
        select 1 from public.notifications n
        where n.source_record_id = new.id and n.recipient_user_id = r.user_id
      );
  end if;
  return new;
end;
$function$;
