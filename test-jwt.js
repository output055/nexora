const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
    email: '<YOUR_SITE_NAME>@gmail.com',
    password: 'red_tiger'
  });
  
  if (loginError) {
    console.error('Login failed:', loginError);
    return;
  }
  
  console.log('Logged in successfully!');
  const userId = session.user.id;
  
  const { data, error } = await supabase
    .from('user_roles')
    .select(`role:roles(id, name, description, created_at, role_permissions(permission:permissions(id, name, description, created_at)))`)
    .eq('user_id', userId);
    
  console.log('Fetch error:', error);
  console.dir(data, { depth: null });
}
test();
