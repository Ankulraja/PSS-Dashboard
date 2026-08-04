const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
});

const clientEmail = envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKeyStr = envVars.GOOGLE_PRIVATE_KEY;
const sheetId = envVars.GOOGLE_SHEET_ID;

console.log('Client Email:', clientEmail);
console.log('Sheet ID:', sheetId);

async function testAuth() {
  const formattedPrivateKey = privateKeyStr.replace(/\\n/g, '\n');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  };

  const encodeBase64Url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(claimSet)}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer
    .sign(formattedPrivateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  console.log('Token Status:', tokenRes.status);
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('Token Error:', tokenData);
    return;
  }

  const accessToken = tokenData.access_token;
  console.log('Got Access Token successfully!');

  // First fetch metadata to list sheet tabs
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log('Meta Status:', metaRes.status);
  const metaData = await metaRes.json();
  if (metaData.sheets) {
    console.log('Sheets/Tabs found:');
    metaData.sheets.forEach(s => console.log(' - Tab Title:', s.properties.title, '| SheetId/GID:', s.properties.sheetId));
    
    // Fetch values from first tab
    const firstTabTitle = metaData.sheets[0].properties.title;
    const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(firstTabTitle)}!A1:Z50000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('Values Status:', valuesRes.status);
    const valuesData = await valuesRes.json();
    if (valuesData.values) {
      console.log('Headers in Sheet:', valuesData.values[0]);
      console.log('Sample Row 1:', valuesData.values[1]);
      console.log('Total Rows:', valuesData.values.length);
    }
  } else {
    console.error('Meta Error:', metaData);
  }
}

testAuth();
