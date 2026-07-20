const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSeed() {
  console.log("Seeding customers...");
  const { error: customerError } = await supabase.from('customers').insert([
    { full_name: 'Adekunle Gold', phone_number: '+2348001112222', os_platform: 'iOS', device_model: 'iPhone 15 Pro', mdm_device_id: 'MDM-IOS-1001', total_owed: 1200000, remaining_balance: 450000, payment_status: 'current' },
    { full_name: 'Burna Boy', phone_number: '+2348003334444', os_platform: 'Android', device_model: 'Samsung Galaxy S24', mdm_device_id: 'MDM-AND-2001', total_owed: 950000, remaining_balance: 950000, payment_status: 'overdue' },
    { full_name: 'Tiwa Savage', phone_number: '+2348005556666', os_platform: 'iOS', device_model: 'iPhone 14', mdm_device_id: 'MDM-IOS-1002', total_owed: 800000, remaining_balance: 0, payment_status: 'current' },
    { full_name: 'Davido Adeleke', phone_number: '+2348007778888', os_platform: 'Android', device_model: 'Google Pixel 8', mdm_device_id: 'MDM-AND-2002', total_owed: 850000, remaining_balance: 200000, payment_status: 'current' },
    { full_name: 'Wizkid Balogun', phone_number: '+2348009990000', os_platform: 'iOS', device_model: 'iPhone 15', mdm_device_id: 'MDM-IOS-1003', total_owed: 1000000, remaining_balance: 800000, payment_status: 'overdue' }
  ]);

  if (customerError) console.error("Error seeding customers:", customerError);
  else console.log("Customers seeded successfully.");

  console.log("Seeding audit logs...");
  const { error: auditError } = await supabase.from('audit_logs').insert([
    { actor_name: 'System Initialization', action_description: 'Database schema and seed data loaded successfully.' }
  ]);
  
  if (auditError) console.error("Error seeding audit logs:", auditError);
  else console.log("Audit logs seeded successfully.");

  console.log("Done!");
}

runSeed();
