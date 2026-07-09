-- ============================================================
-- Nexora Platform — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Permissions ───────────────────────────────────────────────────────────────
create table if not exists public.permissions (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,        -- slug e.g. "force_lock_device"
  description text not null default '',
  created_at  timestamptz not null default now()
);

comment on table public.permissions is 'Application permission slugs';

-- ── Roles ─────────────────────────────────────────────────────────────────────
create table if not exists public.roles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,        -- slug e.g. "field_agent"
  description text not null default '',
  created_at  timestamptz not null default now()
);

comment on table public.roles is 'RBAC roles for platform staff';

-- ── Role ↔ Permission (many-to-many) ─────────────────────────────────────────
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

comment on table public.role_permissions is 'Many-to-many: assigns permissions to roles';

-- ── User ↔ Role ───────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

comment on table public.user_roles is 'Assigns roles to authenticated users';

-- ── Customers ─────────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id                  uuid primary key default uuid_generate_v4(),
  full_name           text not null,
  phone_number        text not null,
  ghana_card_id       text,
  ghana_card_scan_path text,
  alternative_phone_number text,
  whatsapp_number     text,
  digital_address     text,
  location_landmarks  text,
  residential_status  text check (residential_status in ('owner', 'renting', 'family_house', 'other')),
  landlord_contact    text,
  occupation          text,
  place_of_work       text,
  payment_cycle       text check (payment_cycle in ('daily', 'weekly', 'bi_weekly')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.customers is 'Installment financing customers';

create unique index if not exists idx_customers_ghana_card_id on public.customers(ghana_card_id) where ghana_card_id is not null;

-- ── Devices ───────────────────────────────────────────────────────────────────
create table if not exists public.devices (
  id                  uuid primary key default uuid_generate_v4(),
  customer_id         uuid not null references public.customers(id) on delete cascade,
  os_platform         text not null check (os_platform in ('iOS', 'Android')),
  device_model        text not null,
  mdm_device_id       text not null,
  imei                text,
  serial_number       text,
  os_version          text,
  total_owed          numeric(12, 2) not null default 0,
  remaining_balance   numeric(12, 2) not null default 0,
  payment_status      text not null default 'current' check (payment_status in ('current', 'overdue')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.devices is 'MDM devices linked to customers';

create unique index if not exists idx_devices_mdm_device_id on public.devices(mdm_device_id);

insert into storage.buckets (id, name, public)
values ('ghana-card-scans', 'ghana-card-scans', false)
on conflict (id) do nothing;

-- ── Payments ──────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                    uuid primary key default uuid_generate_v4(),
  customer_id           uuid not null references public.customers(id) on delete restrict,
  device_id             uuid references public.devices(id) on delete restrict,
  collector_id          uuid references auth.users(id),
  amount_paid           numeric(12, 2) not null check (amount_paid > 0),
  payment_method        text not null default 'cash' check (payment_method in ('cash', 'paystack_momo', 'bank_transfer')),
  transaction_reference text,
  collection_date       date not null default current_date,
  created_at            timestamptz not null default now()
);

comment on table public.payments is 'Payment entries logged manually or via Paystack';

-- ── Audit Logs ────────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id                  uuid primary key default uuid_generate_v4(),
  actor_name          text not null,
  action_description  text not null,
  timestamp           timestamptz not null default now()
);

comment on table public.audit_logs is 'Immutable event log for all privileged actions';

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_devices_payment_status on public.devices(payment_status);
create index if not exists idx_payments_customer_id on public.payments(customer_id);
create index if not exists idx_payments_collector_id on public.payments(collector_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);

-- ── RLS Policies ──────────────────────────────────────────────────────────────
-- Enable RLS on all tables
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.devices enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Permissions: authenticated users can read
drop policy if exists "Authenticated users can read permissions" on public.permissions;
create policy "Authenticated users can read permissions"
  on public.permissions for select to authenticated using (true);

-- Roles: authenticated users can read
drop policy if exists "Authenticated users can read roles" on public.roles;
create policy "Authenticated users can read roles"
  on public.roles for select to authenticated using (true);

-- Role permissions: authenticated users can read
drop policy if exists "Authenticated users can read role_permissions" on public.role_permissions;
create policy "Authenticated users can read role_permissions"
  on public.role_permissions for select to authenticated using (true);

-- User roles: users can read their own
drop policy if exists "Users can read their own roles" on public.user_roles;
create policy "Users can read their own roles"
  on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- Customers: authenticated staff can read and write
drop policy if exists "Authenticated staff can read customers" on public.customers;
create policy "Authenticated staff can read customers"
  on public.customers for select to authenticated using (true);

drop policy if exists "Authenticated staff can update customers" on public.customers;
create policy "Authenticated staff can update customers"
  on public.customers for update to authenticated using (true);

-- Devices: authenticated staff can read and write
drop policy if exists "Authenticated staff can read devices" on public.devices;
create policy "Authenticated staff can read devices"
  on public.devices for select to authenticated using (true);

drop policy if exists "Authenticated staff can update devices" on public.devices;
create policy "Authenticated staff can update devices"
  on public.devices for update to authenticated using (true);

-- Payments: authenticated staff can insert and read
drop policy if exists "Authenticated staff can insert payments" on public.payments;
create policy "Authenticated staff can insert payments"
  on public.payments for insert to authenticated with check (auth.uid() = collector_id);

drop policy if exists "Authenticated staff can read payments" on public.payments;
create policy "Authenticated staff can read payments"
  on public.payments for select to authenticated using (true);

-- Audit logs: authenticated staff can insert and read
drop policy if exists "Authenticated staff can insert audit logs" on public.audit_logs;
create policy "Authenticated staff can insert audit logs"
  on public.audit_logs for insert to authenticated with check (true);

drop policy if exists "Authenticated staff can read audit logs" on public.audit_logs;
create policy "Authenticated staff can read audit logs"
  on public.audit_logs for select to authenticated using (true);

-- ── Trigger: auto-update updated_at on customers ──────────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.update_updated_at();

drop trigger if exists devices_updated_at on public.devices;
create trigger devices_updated_at
  before update on public.devices
  for each row execute function public.update_updated_at();

-- ── Trigger: update device balance on payment ───────────────────────────────────
create or replace function public.update_device_balance_on_payment()
returns trigger language plpgsql as $$
begin
  if new.device_id is not null then
    update public.devices
    set remaining_balance = greatest(remaining_balance - new.amount_paid, 0)
    where id = new.device_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_update_device_balance on public.payments;
create trigger payments_update_device_balance
  after insert on public.payments
  for each row execute function public.update_device_balance_on_payment();

-- ── Seed Data ─────────────────────────────────────────────────────────────────
-- Default Permissions
insert into public.permissions (name, description) values
  ('view_analytics',     'View dashboard analytics and portfolio metrics'),
  ('log_payment',        'Submit payment entries for customer accounts'),
  ('force_lock_device',  'Manually trigger Miradore device lock command'),
  ('unlock_device',      'Manually trigger Miradore device unlock command'),
  ('manage_customers',   'Create, edit, and archive customer records'),
  ('manage_devices',     'Register devices and manage onboarding workflows'),
  ('manage_roles',       'Create and modify roles and permission assignments'),
  ('view_audit_logs',    'Access the system-wide audit log stream'),
  ('view_customers',     'View customer account records'),
  ('view_settings',      'View and modify global system settings')
on conflict (name) do nothing;

-- Default Roles
insert into public.roles (name, description) values
  ('superadmin',   'Full platform access — all permissions'),
  ('admin',        'Operational oversight — analytics, locks, and audit logs'),
  ('shop_manager', 'Manages a retail outlet — can log payments and view accounts'),
  ('field_agent',  'Field collection agent — payment entry only')
on conflict (name) do nothing;

-- Assign all permissions to superadmin
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'superadmin'
on conflict do nothing;

-- Admin role permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'admin'
  and p.name in ('view_analytics', 'force_lock_device', 'unlock_device', 'manage_customers', 'manage_devices', 'view_audit_logs', 'view_customers', 'view_settings')
on conflict do nothing;

-- Shop manager permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'shop_manager'
  and p.name in ('log_payment', 'view_customers', 'view_analytics')
on conflict do nothing;

-- Field agent permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'field_agent'
  and p.name in ('log_payment', 'view_customers')
on conflict do nothing;
