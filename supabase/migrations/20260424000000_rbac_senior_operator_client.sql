-- =============================================================================
-- Home Design Lab - Schema RBAC definitivo
-- Ruoli: senior (proprietario, accesso totale) | operator | client
-- =============================================================================

-- Extensions
create extension if not exists pg_trgm;

-- -------------------------
-- Enums
-- -------------------------
do $$ begin
  create type public.user_role as enum ('senior', 'operator', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum ('draft','active','on_hold','completed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.blog_post_status as enum ('draft','published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_market_status as enum ('for_sale','for_rent','in_progress','sold','withdrawn','internal_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_visibility as enum ('internal','client_visible');
exception when duplicate_object then null; end $$;

-- -------------------------
-- Helper: updated_at trigger
-- -------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------
-- PROFILES  (one per auth.user)
-- -------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'client'::public.user_role,
  display_name text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -------------------------
-- OPERATOR PERMISSIONS (granular)
-- senior bypasses this table entirely
-- -------------------------
create table if not exists public.operator_permissions (
  id            uuid primary key default gen_random_uuid(),
  operator_id   uuid not null references public.profiles(id) on delete cascade,
  -- feature flags
  can_blog      boolean not null default false,
  can_portfolio boolean not null default false,
  can_collection boolean not null default false,
  can_clients   boolean not null default false,  -- gestione clienti in generale
  -- per-client access: null = tutti i clienti assegnati, altrimenti array di client_id
  allowed_client_ids uuid[] default null,
  granted_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(operator_id)
);
create index if not exists op_perms_operator_idx on public.operator_permissions(operator_id);

drop trigger if exists op_perms_set_updated_at on public.operator_permissions;
create trigger op_perms_set_updated_at
  before update on public.operator_permissions
  for each row execute function public.set_updated_at();

-- -------------------------
-- CLIENTS  (aziende / privati)
-- -------------------------
create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  legal_name      text not null,
  tax_id          text,
  billing_email   text,
  phone           text,
  billing_address jsonb,
  notes_internal  text,
  assigned_operator_id uuid references public.profiles(id) on delete set null,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists clients_legal_name_idx on public.clients using gin(legal_name gin_trgm_ops);
create index if not exists clients_operator_idx on public.clients(assigned_operator_id);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- Client ↔ User join (cliente può avere account login)
create table if not exists public.client_users (
  client_id  uuid not null references public.clients(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index if not exists client_users_user_idx on public.client_users(user_id);

-- -------------------------
-- PROJECTS
-- -------------------------
create table if not exists public.projects (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.clients(id) on delete restrict,
  title                text not null,
  description          text,
  status               public.project_status not null default 'active'::public.project_status,
  assigned_operator_id uuid references public.profiles(id) on delete set null,
  cover_image          text,
  location             text,
  surface              text,
  duration             text,
  budget               text,
  category             text,
  is_public            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists projects_public_idx on public.projects(is_public) where is_public = true;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- -------------------------
-- PROJECT DOCUMENTS
-- -------------------------
create table if not exists public.project_documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  title        text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  visibility   public.document_visibility not null default 'internal'::public.document_visibility,
  created_at   timestamptz not null default now()
);
create index if not exists proj_docs_project_idx on public.project_documents(project_id);
create index if not exists proj_docs_visibility_idx on public.project_documents(project_id, visibility);

-- -------------------------
-- BLOG POSTS
-- -------------------------
create table if not exists public.blog_posts (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  excerpt        text,
  body           jsonb not null default '{}'::jsonb,
  cover_image    text,
  author_id      uuid references public.profiles(id) on delete set null,
  category       text,
  status         public.blog_post_status not null default 'draft'::public.blog_post_status,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists blog_posts_status_idx on public.blog_posts(status, published_at desc);
create index if not exists blog_posts_slug_idx on public.blog_posts(slug);

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- -------------------------
-- PROPERTIES  (Home Design Collection)
-- -------------------------
create table if not exists public.properties (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text unique,
  description    text,
  market_status  public.property_market_status not null default 'internal_only'::public.property_market_status,
  price          numeric(14,2),
  currency       text not null default 'EUR',
  surface        numeric(12,2),
  rooms          int,
  location       text,
  energy_class   text,
  cover_image    text,
  is_public      boolean not null default false,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists properties_public_idx on public.properties(is_public, market_status) where is_public = true;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- -------------------------
-- HELPER FUNCTIONS (usate da RLS)
-- -------------------------
create or replace function public.is_senior(uid uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'senior'::public.user_role);
$$;

create or replace function public.is_operator(uid uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role in ('senior','operator')::public.user_role[]);
$$;

create or replace function public.is_client(uid uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'client'::public.user_role);
$$;

create or replace function public.operator_can(uid uuid, feature text)
returns boolean language sql security definer set search_path = public stable as $$
  select
    public.is_senior(uid)
    or (
      public.is_operator(uid)
      and exists(
        select 1 from public.operator_permissions op
        where op.operator_id = uid
          and case feature
                when 'blog'       then op.can_blog
                when 'portfolio'  then op.can_portfolio
                when 'collection' then op.can_collection
                when 'clients'    then op.can_clients
                else false
              end
      )
    );
$$;

-- -------------------------
-- ROW LEVEL SECURITY
-- -------------------------

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  using (auth.uid() = id);
drop policy if exists "profiles_operator_read" on public.profiles;
create policy "profiles_operator_read" on public.profiles
  for select using (public.is_operator(auth.uid()));

-- operator_permissions
alter table public.operator_permissions enable row level security;
drop policy if exists "op_perms_senior" on public.operator_permissions;
create policy "op_perms_senior" on public.operator_permissions
  using (public.is_senior(auth.uid()));
drop policy if exists "op_perms_own_read" on public.operator_permissions;
create policy "op_perms_own_read" on public.operator_permissions
  for select using (operator_id = auth.uid());

-- clients
alter table public.clients enable row level security;
drop policy if exists "clients_operator_all" on public.clients;
create policy "clients_operator_all" on public.clients
  using (public.is_operator(auth.uid()));
drop policy if exists "clients_own_read" on public.clients;
create policy "clients_own_read" on public.clients
  for select using (
    exists(
      select 1 from public.client_users cu
      where cu.client_id = id and cu.user_id = auth.uid()
    )
  );

-- projects
alter table public.projects enable row level security;
drop policy if exists "projects_public" on public.projects;
create policy "projects_public" on public.projects
  for select using (is_public = true);
drop policy if exists "projects_operator" on public.projects;
create policy "projects_operator" on public.projects
  using (public.is_operator(auth.uid()));
drop policy if exists "projects_client_own" on public.projects;
create policy "projects_client_own" on public.projects
  for select using (
    exists(
      select 1 from public.client_users cu
      where cu.client_id = projects.client_id and cu.user_id = auth.uid()
    )
  );

-- project_documents
alter table public.project_documents enable row level security;
drop policy if exists "proj_docs_operator" on public.project_documents;
create policy "proj_docs_operator" on public.project_documents
  using (public.is_operator(auth.uid()));
drop policy if exists "proj_docs_client" on public.project_documents;
create policy "proj_docs_client" on public.project_documents
  for select using (
    visibility = 'client_visible'::public.document_visibility
    and exists(
      select 1 from public.projects pr
      join public.client_users cu on cu.client_id = pr.client_id
      where pr.id = project_id and cu.user_id = auth.uid()
    )
  );

-- blog_posts
alter table public.blog_posts enable row level security;
drop policy if exists "blog_public" on public.blog_posts;
create policy "blog_public" on public.blog_posts
  for select using (status = 'published'::public.blog_post_status);
drop policy if exists "blog_operator" on public.blog_posts;
create policy "blog_operator" on public.blog_posts
  using (public.operator_can(auth.uid(), 'blog'));

-- properties
alter table public.properties enable row level security;
drop policy if exists "properties_public" on public.properties;
create policy "properties_public" on public.properties
  for select using (is_public = true);
drop policy if exists "properties_operator" on public.properties;
create policy "properties_operator" on public.properties
  using (public.operator_can(auth.uid(), 'collection'));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, role, display_name)
  values(
    new.id,
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'client'::public.user_role
    ),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1))
  )
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
