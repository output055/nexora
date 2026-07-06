import * as dotenv from 'dotenv';
import { fetchDeviceProfiles } from './src/lib/hexnode';

dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const profiles = await fetchDeviceProfiles();
    console.log("SUCCESS:", JSON.stringify(profiles, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

main();
