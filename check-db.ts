import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: customers, error: cErr } = await supabase.from('customers').select('*');
  const { data: devices, error: dErr } = await supabase.from('devices').select('*');

  console.log('Customers Error:', cErr);
  console.log('Customers Count:', customers?.length);

  console.log('Devices Error:', dErr);
  console.log('Devices Count:', devices?.length);
}

check();
