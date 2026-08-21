const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^#\s=]+)\s*=\s*(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^["']?(.*?)["']?$/, '$1');
  }
});
console.log('URL:', env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('Inserting paystack_reviewer role...');
  
  // 1. Insert role
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .insert([
      { name: 'paystack_reviewer', description: 'Read-only access for external compliance and demo reviews' }
    ])
    .select('id')
    .single();

  if (roleError && roleError.code !== '23505') {
    console.error('Error inserting role:', roleError.message);
  }
  
  let roleId = roleData?.id;
  
  if (!roleId) {
    const { data: existingRole } = await supabase.from('roles').select('id').eq('name', 'paystack_reviewer').single();
    if (existingRole) roleId = existingRole.id;
  }
  
  if (!roleId) {
    console.error('Could not get or create role ID');
    return;
  }
  
  console.log('Role ID:', roleId);

  // 2. Get permissions
  const { data: permissions } = await supabase
    .from('permissions')
    .select('id, name')
    .in('name', ['view_analytics', 'view_customers', 'view_settings']);
    
  if (!permissions || permissions.length === 0) {
    console.log('Could not find permissions. Skipping permission assignment.');
    return;
  }

  // 3. Assign permissions
  const rolePermissions = permissions.map(p => ({
    role_id: roleId,
    permission_id: p.id
  }));

  const { error: permError } = await supabase
    .from('role_permissions')
    .insert(rolePermissions);

  if (permError && permError.code !== '23505') {
    console.error('Error assigning permissions:', permError.message);
  } else {
    console.log('Role and permissions set up successfully!');
  }
}

main().catch(console.error);
