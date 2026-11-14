// Schéma de la base. Chaque entrée est une migration appliquée une seule fois, dans l'ordre.
// Ne jamais modifier une migration publiée : en ajouter une nouvelle.
export const MIGRATIONS: string[] = [
  `
  create table orgs (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    plan text not null default 'decouverte',
    plan_source text not null default 'default',
    stripe_customer_id text unique,
    stripe_subscription_id text,
    subscription_status text,
    current_period_end timestamptz,
    offer jsonb not null default '{}'::jsonb,
    weights jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create table users (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    email text not null unique,
    name text not null default '',
    password_hash text not null,
    role text not null default 'owner',
    is_admin boolean not null default false,
    disabled_at timestamptz,
    created_at timestamptz not null default now(),
    last_login_at timestamptz
  );
  create index users_org_idx on users(org_id);
  create table sessions (
    id text primary key,
    user_id uuid not null references users(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    ip text,
    user_agent text
  );
  create index sessions_user_idx on sessions(user_id);
  create table password_resets (
    token_hash text primary key,
    user_id uuid not null references users(id) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz
  );
  create table invitations (
    token_hash text primary key,
    org_id uuid not null references orgs(id) on delete cascade,
    email text not null,
    invited_by uuid references users(id) on delete set null,
    expires_at timestamptz not null,
    accepted_at timestamptz,
    created_at timestamptz not null default now()
  );
  create table outbox (
    id uuid primary key default gen_random_uuid(),
    to_email text not null,
    subject text not null,
    body text not null,
    created_at timestamptz not null default now()
  );
  create table companies (
    siren text primary key,
    data jsonb not null,
    fetched_at timestamptz not null default now()
  );
  create table company_enrichments (
    siren text primary key references companies(siren) on delete cascade,
    website jsonb,
    signals jsonb,
    places jsonb,
    analyzed_at timestamptz not null default now()
  );
  create table analyses (
    org_id uuid not null references orgs(id) on delete cascade,
    siren text not null references companies(siren) on delete cascade,
    score int not null,
    category text not null,
    confidence text not null,
    breakdown jsonb not null,
    insights jsonb not null,
    ai_used boolean not null default false,
    created_at timestamptz not null default now(),
    primary key (org_id, siren)
  );
  create table prospects (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    siren text not null references companies(siren) on delete cascade,
    status text not null default 'nouveau',
    favorite boolean not null default false,
    owner_id uuid references users(id) on delete set null,
    last_contact_at timestamptz,
    next_followup_at date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (org_id, siren)
  );
  create index prospects_org_status_idx on prospects(org_id, status);
  create table interactions (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    prospect_id uuid not null references prospects(id) on delete cascade,
    user_id uuid references users(id) on delete set null,
    kind text not null,
    content text not null default '',
    created_at timestamptz not null default now()
  );
  create index interactions_prospect_idx on interactions(prospect_id, created_at desc);
  create table lists (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now()
  );
  create table list_items (
    list_id uuid not null references lists(id) on delete cascade,
    siren text not null references companies(siren) on delete cascade,
    added_at timestamptz not null default now(),
    primary key (list_id, siren)
  );
  create table searches (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    user_id uuid references users(id) on delete set null,
    name text,
    params jsonb not null,
    sirens jsonb not null default '[]'::jsonb,
    total int not null default 0,
    saved boolean not null default false,
    created_at timestamptz not null default now()
  );
  create index searches_org_idx on searches(org_id, created_at desc);
  create table messages (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    user_id uuid references users(id) on delete set null,
    siren text not null,
    channel text not null,
    tone text not null,
    service text,
    content text not null,
    ai_used boolean not null default false,
    created_at timestamptz not null default now()
  );
  create table usage (
    org_id uuid not null references orgs(id) on delete cascade,
    period text not null,
    prospects int not null default 0,
    ai_messages int not null default 0,
    searches int not null default 0,
    primary key (org_id, period)
  );
  create table usage_prospects (
    org_id uuid not null references orgs(id) on delete cascade,
    period text not null,
    siren text not null,
    primary key (org_id, period, siren)
  );
  create table api_logs (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    operation text not null,
    ok boolean not null,
    status int,
    ms int,
    error text,
    org_id uuid,
    created_at timestamptz not null default now()
  );
  create index api_logs_created_idx on api_logs(created_at desc);
  create table ai_usage (
    id uuid primary key default gen_random_uuid(),
    org_id uuid,
    kind text not null,
    model text,
    input_tokens int not null default 0,
    output_tokens int not null default 0,
    cost_eur double precision not null default 0,
    created_at timestamptz not null default now()
  );
  create table reports (
    id uuid primary key default gen_random_uuid(),
    kind text not null,
    siren text,
    email text,
    message text not null,
    status text not null default 'ouvert',
    user_id uuid,
    created_at timestamptz not null default now(),
    handled_at timestamptz
  );
  create table suppressions (
    id uuid primary key default gen_random_uuid(),
    siren text unique,
    email text unique,
    reason text,
    created_at timestamptz not null default now()
  );
  create table rate_limits (
    key text primary key,
    window_start timestamptz not null,
    count int not null
  );
  create table cache (
    key text primary key,
    value jsonb not null,
    expires_at timestamptz not null
  );
  `,
  // 2 — Radar (veille quotidienne, notifications, résumé e-mail) et rapports d'audit publics
  `
  create table notifications (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    kind text not null,
    siren text,
    search_id uuid references searches(id) on delete set null,
    title text not null,
    detail text,
    url text,
    source_url text,
    event_date date,
    dedupe_key text not null,
    created_at timestamptz not null default now(),
    read_at timestamptz,
    unique (org_id, dedupe_key)
  );
  create index notifications_org_idx on notifications(org_id, created_at desc);
  alter table searches add column alert boolean not null default false;
  alter table searches add column alert_checked_at timestamptz;
  alter table orgs add column digest text not null default 'hebdo';
  alter table orgs add column digest_sent_at timestamptz;
  alter table orgs add column radar_checked_at timestamptz;
  create table audit_reports (
    id text primary key,
    url text not null,
    host text not null,
    audit jsonb not null,
    org_id uuid references orgs(id) on delete set null,
    siren text,
    created_at timestamptz not null default now(),
    views int not null default 0
  );
  create index audit_reports_created_idx on audit_reports(created_at desc);
  `,
];
