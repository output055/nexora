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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false }});

async function checkDb() {
  console.log("Checking users...");
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error fetching users:", userError);
  } else {
    console.log("Users found:", users?.users?.length || 0);
    for (const u of users?.users || []) {
      console.log(`- ${u.email} (ID: ${u.id})`);
    }
  }

  console.log("\nChecking user_roles...");
  const { data: userRoles, error: rolesError } = await supabase.from('user_roles').select('*, roles(name)');
  if (rolesError) {
    console.error("Error fetching user_roles:", rolesError);
  } else {
    console.log("User roles found:", userRoles?.length || 0);
    console.log(userRoles);
  }

  console.log("\nChecking customers...");
  const { data: customers, error: custError } = await supabase.from('customers').select('id, full_name');
  if (custError) {
    console.error("Error fetching customers:", custError);
  } else {
    console.log("Customers found:", customers?.length || 0);
  }
}

checkDb();
