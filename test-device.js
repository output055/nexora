import * as dotenv from 'dotenv';
import { getDeviceDetails } from './src/lib/hexnode';

dotenv.config({ path: '.env.local' });

async function main() {
  try {
    // We need a valid hexnode device id. Let's see what is in the DB.
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: devices } = await supabase.from('devices').select('hexnode_device_id').limit(1);
    
    let deviceId = devices?.[0]?.hexnode_device_id;
    if (!deviceId) {
      console.log('No devices found in DB. Please provide an ID manually.');
      return;
    }
    
    console.log(`Fetching details for device: ${deviceId}`);
    const details = await getDeviceDetails(deviceId);
    console.log(JSON.stringify(details, null, 2));
  } catch (err) {
    console.error(err.message);
  }
}

main();
