import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.HEXNODE_API_KEY;
const PORTAL_NAME = process.env.HEXNODE_PORTAL_NAME;
const DEVICE_ID = 1; // Since we saw "id": 1 in the screenshot or we can query it

async function main() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: devices } = await supabase.from('devices').select('hexnode_device_id').limit(1);
    
    let deviceId = devices?.[0]?.hexnode_device_id;
    if (!deviceId) return console.log('No devices found in DB');

    console.log(`Sending action to device: ${deviceId}`);
    
    const endpoint = `https://${PORTAL_NAME}.uem.hexnode.com/api/v1/actions/`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action_name: 'scan_device',
        devices: [deviceId]
      })
    });

    console.log(response.status, response.statusText);
    console.log(await response.text());
  } catch (err) {
    console.error(err.message);
  }
}

main();
