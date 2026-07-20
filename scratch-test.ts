import { getValidAccessToken } from './src/lib/manageengine';
import { loadEnvConfig } from '@next/env';
import path from 'path';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function testURL(url: string) {
  try {
    const accessToken = await getValidAccessToken();
    console.log(`Testing URL: ${url}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.slice(0, 200)}...`);
  } catch (err: any) {
    console.error(`Error with ${url}:`, err.message);
  }
}

async function run() {
  const accessToken = await getValidAccessToken();
  const res = await fetch('https://mdm.manageengine.com/api/v1/mdm/devices', {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Zoho-oauthtoken ${accessToken}` }
  });
  const data = await res.json();
  if (!data.devices || data.devices.length === 0) return console.log('No devices');
  const deviceId = data.devices[0].device_id;
  console.log('Testing GET device details');
  const url3 = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}`;
  const res3 = await fetch(url3, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Zoho-oauthtoken ${accessToken}` }
  });
  console.log(res3.status, await res3.text());
}

run();
