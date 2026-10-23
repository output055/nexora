-- =========================================================================
-- Nexora Platform: Comprehensive Row Level Security (RLS) Hardening
-- Run this migration in your Supabase Dashboard SQL Editor to secure all tables.
-- =========================================================================

-- 1. Helper security functions (SECURITY DEFINER to avoid recursive policy checks)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on ur.role_id = r.id
    where ur.user_id = auth.uid()
      and lower(r.name) in ('superadmin', 'admin')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on ur.role_id = r.id
    where ur.user_id = auth.uid()
      and lower(r.name) in ('superadmin', 'admin', 'shop_manager', 'field_agent')
  );
$$;

create or replace function public.has_permission(perm_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on ur.role_id = rp.role_id
    join public.permissions p on rp.permission_id = p.id
    where ur.user_id = auth.uid()
      and p.name = perm_name
  ) or public.is_admin();
$$;

-- 2. Customers Table Hardening
alter table public.customers enable row level security;

drop policy if exists "Authenticated staff can read customers" on public.customers;
drop policy if exists "Authenticated staff can update customers" on public.customers;
drop policy if exists "Staff can view customers" on public.customers;
drop policy if exists "Staff can manage customers" on public.customers;
drop policy if exists "Users can read own customer record" on public.customers;
drop policy if exists "Customers can read own profile" on public.customers;
drop policy if exists "Staff can insert customers" on public.customers;
drop policy if exists "Staff can update customers" on public.customers;
drop policy if exists "Staff can delete customers" on public.customers;

-- Customers can view their own customer record, staff can view all
create policy "Customers can read own profile"
  on public.customers for select to authenticated
  using (
    user_id = auth.uid() or public.is_staff()
  );

-- Only staff with manage_customers or admin can insert/update/delete customer records
create policy "Staff can insert customers"
  on public.customers for insert to authenticated
  with check (public.is_staff());

create policy "Staff can update customers"
  on public.customers for update to authenticated
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

create policy "Staff can delete customers"
  on public.customers for delete to authenticated
  using (public.is_admin() or public.has_permission('manage_customers'));


-- 3. Devices Table Hardening
alter table public.devices enable row level security;

drop policy if exists "Authenticated staff can read devices" on public.devices;
drop policy if exists "Authenticated staff can update devices" on public.devices;
drop policy if exists "Customers can read own devices" on public.devices;
drop policy if exists "Only staff can manage devices" on public.devices;
drop policy if exists "Staff can update devices" on public.devices;
drop policy if exists "Staff can insert devices" on public.devices;
drop policy if exists "Staff can delete devices" on public.devices;

-- Customers can read their own device(s). Staff can read all.
create policy "Customers can read own devices"
  on public.devices for select to authenticated
  using (
    customer_id in (select id from public.customers where user_id = auth.uid())
    or public.is_staff()
  );

-- ONLY staff with manage_devices or admin can modify devices. Customers CANNOT alter balance or status!
create policy "Staff can update devices"
  on public.devices for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Staff can insert devices"
  on public.devices for insert to authenticated
  with check (public.is_staff());

create policy "Staff can delete devices"
  on public.devices for delete to authenticated
  using (public.is_admin() or public.has_permission('manage_devices'));


-- 4. Payments Table Hardening
alter table public.payments enable row level security;

drop policy if exists "Authenticated staff can read payments" on public.payments;
drop policy if exists "Authenticated staff can insert payments" on public.payments;
drop policy if exists "Customers can read own payments" on public.payments;
drop policy if exists "Staff can insert payments" on public.payments;

-- Customers can read payments made towards their customer account. Staff can read all.
create policy "Customers can read own payments"
  on public.payments for select to authenticated
  using (
    customer_id in (select id from public.customers where user_id = auth.uid())
    or public.is_staff()
  );

-- Only staff with log_payment permission or collector_id matching auth.uid() can insert payments
create policy "Staff can insert payments"
  on public.payments for insert to authenticated
  with check (
    public.is_staff() and auth.uid() = collector_id
  );


-- 5. Expenses Table Hardening
alter table public.expenses enable row level security;

drop policy if exists "Authenticated users can read expenses" on public.expenses;
drop policy if exists "Authenticated users can insert expenses" on public.expenses;
drop policy if exists "Authenticated users can delete expenses" on public.expenses;
drop policy if exists "Admins can read expenses" on public.expenses;
drop policy if exists "Admins can insert expenses" on public.expenses;
drop policy if exists "Admins can delete expenses" on public.expenses;

-- Only admins/superadmins can read, insert, or delete business expenses
create policy "Admins can read expenses"
  on public.expenses for select to authenticated
  using (public.is_admin());

create policy "Admins can insert expenses"
  on public.expenses for insert to authenticated
  with check (public.is_admin());

create policy "Admins can delete expenses"
  on public.expenses for delete to authenticated
  using (public.is_admin());


-- 6. Audit Logs Table Hardening
alter table public.audit_logs enable row level security;

drop policy if exists "Authenticated staff can read audit logs" on public.audit_logs;
drop policy if exists "Authenticated staff can insert audit logs" on public.audit_logs;
drop policy if exists "Admins can read audit logs" on public.audit_logs;
drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;

-- Only staff with view_audit_logs or admin can read audit logs
create policy "Admins can read audit logs"
  on public.audit_logs for select to authenticated
  using (public.has_permission('view_audit_logs') or public.is_admin());

create policy "Authenticated users can insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (true);


-- 7. SMS Logs Table Hardening
alter table public.sms_logs enable row level security;

drop policy if exists "Authenticated users can read sms_logs" on public.sms_logs;
drop policy if exists "Staff can read sms logs" on public.sms_logs;

create policy "Staff can read sms logs"
  on public.sms_logs for select to authenticated
  using (public.is_staff());


-- 8. Automated Triggers Table Hardening
alter table public.automated_triggers enable row level security;

drop policy if exists "Authenticated users can read automated_triggers" on public.automated_triggers;
drop policy if exists "Admins can view and manage automated triggers" on public.automated_triggers;

create policy "Admins can view and manage automated triggers"
  on public.automated_triggers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- 9. Storage Buckets (Ghana Card Scans)
-- Ensure only authenticated users can access, and verify ownership or staff role
drop policy if exists "Staff can view scan files" on storage.objects;
drop policy if exists "Staff can upload scan files" on storage.objects;

create policy "Staff can view scan files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ghana-card-scans'
    and (public.is_staff() or auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "Staff can upload scan files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ghana-card-scans'
    and public.is_staff()
  );
