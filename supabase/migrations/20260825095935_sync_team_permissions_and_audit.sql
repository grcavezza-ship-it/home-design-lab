-- Mirrors the production migration applied as version 20260825095935.

create or replace function public.sync_operator_access_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
declare j jsonb;
begin
  j := coalesce(new.permessi_dettagli, '{}'::jsonb);
  if j ? 'accesso_attivo' then new.accesso_attivo := coalesce((j->>'accesso_attivo')::boolean, true); end if;
  if j ? 'portal_role' then new.ruolo_portale := coalesce(j->>'portal_role', new.ruolo_portale, 'collaboratore'); end if;
  if tg_op = 'UPDATE' and (new.accesso_attivo is distinct from old.accesso_attivo or new.ruolo_portale is distinct from old.ruolo_portale) and new.permessi_dettagli is not distinct from old.permessi_dettagli then
    new.permessi_dettagli := j || jsonb_build_object('accesso_attivo', new.accesso_attivo, 'portal_role', new.ruolo_portale);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_operator_access_fields on public.operatori_profiles;
create trigger trg_sync_operator_access_fields before insert or update on public.operatori_profiles for each row execute function public.sync_operator_access_fields();

create or replace function public.audit_operator_profile_changes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.operator_audit_log(operator_profile_id, actor_user_id, action, details)
    values (new.id, auth.uid(), 'created', jsonb_build_object('email', new.email, 'ruolo_portale', new.ruolo_portale, 'accesso_attivo', new.accesso_attivo));
  elsif tg_op = 'UPDATE' and (new.email is distinct from old.email or new.nome is distinct from old.nome or new.cognome is distinct from old.cognome or new.ruolo_portale is distinct from old.ruolo_portale or new.accesso_attivo is distinct from old.accesso_attivo or new.permessi_dettagli is distinct from old.permessi_dettagli or new.progetti_assegnati is distinct from old.progetti_assegnati) then
    insert into public.operator_audit_log(operator_profile_id, actor_user_id, action, details)
    values (new.id, auth.uid(), 'updated', jsonb_build_object('email_changed', new.email is distinct from old.email, 'name_changed', (new.nome is distinct from old.nome or new.cognome is distinct from old.cognome), 'role_changed', new.ruolo_portale is distinct from old.ruolo_portale, 'access_changed', new.accesso_attivo is distinct from old.accesso_attivo, 'permissions_changed', new.permessi_dettagli is distinct from old.permessi_dettagli, 'projects_changed', new.progetti_assegnati is distinct from old.progetti_assegnati));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_operator_profile_changes on public.operatori_profiles;
create trigger trg_audit_operator_profile_changes after insert or update on public.operatori_profiles for each row execute function public.audit_operator_profile_changes();