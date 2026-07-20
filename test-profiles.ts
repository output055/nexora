import { getValidAccessToken } from './src/lib/manageengine';

async function test() {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/profiles/search`;
    const accessToken = await getValidAccessToken(false);
    
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Accept': 'application/json'
        }
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
    
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();
