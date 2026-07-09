-- Seed Customers
insert into public.customers (full_name, phone_number, os_platform, device_model, mdm_device_id, total_owed, remaining_balance, payment_status) values
('Adekunle Gold', '+2348001112222', 'iOS', 'iPhone 15 Pro', 'MDM-IOS-1001', 1200000, 450000, 'current'),
('Burna Boy', '+2348003334444', 'Android', 'Samsung Galaxy S24', 'MDM-AND-2001', 950000, 950000, 'overdue'),
('Tiwa Savage', '+2348005556666', 'iOS', 'iPhone 14', 'MDM-IOS-1002', 800000, 0, 'current'),
('Davido Adeleke', '+2348007778888', 'Android', 'Google Pixel 8', 'MDM-AND-2002', 850000, 200000, 'current'),
('Wizkid Balogun', '+2348009990000', 'iOS', 'iPhone 15', 'MDM-IOS-1003', 1000000, 800000, 'overdue')
on conflict (mdm_device_id) do nothing;

-- Seed an audit log just to have something
insert into public.audit_logs (actor_name, action_description) values
('System Initialization', 'Database schema and seed data loaded successfully.');

-- Allow full access to roles and permissions for authenticated users (for demo/admin purposes)
drop policy if exists "Authenticated staff can manage permissions" on public.permissions;
create policy "Authenticated staff can manage permissions"
  on public.permissions for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated staff can manage roles" on public.roles;
create policy "Authenticated staff can manage roles"
  on public.roles for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated staff can manage role_permissions" on public.role_permissions;
create policy "Authenticated staff can manage role_permissions"
  on public.role_permissions for all to authenticated using (true) with check (true);

-- Assign superadmin role to all existing users in the auth.users table
-- Run this after creating a user via the UI to give them full access
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
cross join public.roles r
where r.name = 'superadmin'
on conflict do nothing;
