-- Idempotent team access-control schema migration.
-- This file mirrors the production migration applied as version 20260825095749.

alter table public.operatori_profiles add column if not exists accesso_attivo boolean not null default true;
alter table public.operatori_profiles add column if not exists ruolo_portale text;
update public.operatori_profiles set ruolo_portale = case when lower(coalesce(ruolo,''))='admin' then 'admin' when lower(coalesce(ruolo,'')) in ('operatore','operator','architect') then 'collaboratore' else coalesce(ruolo_portale,'collaboratore') end where ruolo_portale is null;
alter table public.operatori_profiles alter column ruolo_portale set default 'collaboratore';
do $$ begin if not exists (select 1 from pg_constraint where conname='operatori_profiles_ruolo_portale_check') then alter table public.operatori_profiles add constraint operatori_profiles_ruolo_portale_check check (ruolo_portale in ('admin','segretaria','collaboratore')); end if; end $$;
create table if not exists public.operator_audit_log (id uuid primary key default gen_random_uuid(), operator_profile_id uuid references public.operatori_profiles(id) on delete set null, actor_user_id uuid references auth.users(id) on delete set null, action text not null, details jsonb, created_at timestamptz not null default now());
create index if not exists idx_operator_audit_log_operator on public.operator_audit_log(operator_profile_id);
create index if not exists idx_operator_audit_log_actor on public.operator_audit_log(actor_user_id);
create index if not exists idx_operator_audit_log_created_at on public.operator_audit_log(created_at desc);