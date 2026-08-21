-- Run this script in your Supabase SQL Editor

-- 1. Create the new demo role
insert into public.roles (name, description) 
values ('paystack_reviewer', 'Read-only access for external compliance and demo reviews')
on conflict (name) do nothing;

-- 2. Assign safe, read-only permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'paystack_reviewer'
  and p.name in ('view_analytics', 'view_customers', 'view_settings')
on conflict do nothing;

-- 3. (Optional) If you have already created the paystack-demo@nexora.com user in Auth, 
-- you can assign the role manually here by replacing YOUR_USER_ID
-- insert into public.user_roles (user_id, role_id)
-- select 'YOUR_USER_ID', id from public.roles where name = 'paystack_reviewer';
