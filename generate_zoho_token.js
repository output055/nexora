const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
require('dotenv').config({ path: '.env.local' });

// ==========================================
// Zoho MDM OAuth Token Generator
// ==========================================
// 1. Go to Zoho API Console (https://api-console.zoho.com or .eu / .in depending on your region)
// 2. Select your Client (or create a Server-based client)
// 3. Click "Generate Code" (3 vertical dots -> Generate Code)
// 4. Scope: MDMOnDemand.MDMInventory.READ,MDMOnDemand.MDMInventory.CREATE
// 5. Paste the generated Grant Code below and run this script!

const GRANT_CODE = 'PASTE_YOUR_GRANT_CODE_HERE'; 

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';

if (GRANT_CODE === 'PASTE_YOUR_GRANT_CODE_HERE') {
  console.error('\n[ERROR] You need to paste your generated Grant Code into the script on line 12!\n');
  process.exit(1);
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n[ERROR] Missing CLIENT_ID or CLIENT_SECRET in your .env.local file!\n');
  process.exit(1);
}

const params = querystring.stringify({
  grant_type: 'authorization_code',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code: GRANT_CODE
});

const url = new URL(`${ACCOUNTS_URL}/oauth/v2/token`);

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(params)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const response = JSON.parse(data);
    
    if (response.error) {
      console.error('\n[FAILED] Zoho API returned an error:');
      console.error(response);
      console.error('\nRemember: Grant Codes EXPIRE IN 3 MINUTES! You may need to generate a new one.');
    } else {
      console.log('\n[SUCCESS] Successfully generated your permanent Refresh Token!\n');
      console.log('--- Copy the token below ---');
      console.log(`ZOHO_REFRESH_TOKEN="${response.refresh_token}"`);
      console.log('----------------------------\n');
      console.log('Update this value in your .env.local file and restart the Next.js server.');
    }
  });
});

req.on('error', (e) => {
  console.error(`\n[ERROR] Request failed: ${e.message}`);
});

req.write(params);
req.end();
