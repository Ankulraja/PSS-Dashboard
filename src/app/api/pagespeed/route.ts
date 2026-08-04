import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { normalizeRecord } from '@/lib/pagespeed';
import { PageSpeedApiResponse, ProcessedRecord, RawPageSpeedRecord } from '@/types/pagespeed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SHEET_ID = '1lPQb5P7JXLRfj0eMBpPrzxqZDRd4C2ukszK9Ew79MsA';
const DEFAULT_SHEET_GID = '1292258845';

/**
 * Generate OAuth2 Access Token for Google Service Account using Node crypto module
 */
async function getServiceAccountAccessToken(clientEmail: string, privateKeyStr: string): Promise<string | null> {
  try {
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

    const encodeBase64Url = (obj: object) =>
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
      cache: 'no-store',
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      return data.access_token || null;
    } else {
      const errorText = await tokenRes.text();
      console.error('Google OAuth token request error:', errorText);
    }
  } catch (err) {
    console.error('Service Account JWT token error:', err);
  }
  return null;
}

/**
 * Parses CSV content line by line into RawPageSpeedRecord array.
 */
function parseCsvToRawRecords(csvText: string): RawPageSpeedRecord[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map((h) => h.trim());
  const records: RawPageSpeedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (!row.length || row.every((val) => val.trim() === '')) continue;
    
    const item: Record<string, unknown> = {};
    headers.forEach((h, colIndex) => {
      item[h] = row[colIndex] !== undefined ? row[colIndex].trim() : '';
    });

    records.push(item as unknown as RawPageSpeedRecord);
  }
  return records;
}

function parseCsvRow(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const sheetGid = process.env.GOOGLE_SHEET_GID || DEFAULT_SHEET_GID;
  const apiKey = process.env.GOOGLE_API_KEY;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  let records: ProcessedRecord[] = [];
  let credentialsConfigured = Boolean(serviceAccountEmail || apiKey);
  let fetchErrorMsg: string | undefined = undefined;

  // 1. Try Service Account Authentication if credentials present
  if (serviceAccountEmail && serviceAccountPrivateKey) {
    const accessToken = await getServiceAccountAccessToken(serviceAccountEmail, serviceAccountPrivateKey);
    if (accessToken) {
      try {
        // Fetch sheet metadata to find correct sheet tab title or match GID
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=false`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });

        let targetTabTitle = 'A1:Z50000';
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (metaData.sheets && metaData.sheets.length > 0) {
            // Find tab matching sheetGid or fallback to first tab
            const targetSheet = metaData.sheets.find(
              (s: { properties: { sheetId: number } }) => String(s.properties.sheetId) === String(sheetGid)
            ) || metaData.sheets[0];

            if (targetSheet && targetSheet.properties && targetSheet.properties.title) {
              targetTabTitle = `'${targetSheet.properties.title}'!A1:Z50000`;
            }
          }
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${targetTabTitle}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const json = await res.json();
          const rows: string[][] = json.values || [];
          if (rows.length > 1) {
            const headers = rows[0].map((h) => h.trim());
            const rawList: RawPageSpeedRecord[] = [];
            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              const item: Record<string, unknown> = {};
              headers.forEach((h, idx) => {
                item[h] = r[idx] ?? '';
              });
              rawList.push(item as unknown as RawPageSpeedRecord);
            }
            records = rawList
              .map((raw, idx) => normalizeRecord(raw, idx))
              .filter((r): r is ProcessedRecord => r !== null);
          }
        } else {
          fetchErrorMsg = `Google Sheet access returned status ${res.status}. Ensure sheet is shared with: ${serviceAccountEmail}`;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fetchErrorMsg = `Service Account Fetch Error: ${msg}`;
      }
    } else {
      fetchErrorMsg = 'Failed to generate OAuth token for Service Account.';
    }
  }

  // 2. Try Google Sheets API Key if available and no records yet
  if (records.length === 0 && apiKey) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z50000?key=${apiKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const rows: string[][] = json.values || [];
        if (rows.length > 1) {
          const headers = rows[0].map((h) => h.trim());
          const rawList: RawPageSpeedRecord[] = [];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const item: Record<string, unknown> = {};
            headers.forEach((h, idx) => {
              item[h] = r[idx] ?? '';
            });
            rawList.push(item as unknown as RawPageSpeedRecord);
          }
          records = rawList
            .map((raw, idx) => normalizeRecord(raw, idx))
            .filter((r): r is ProcessedRecord => r !== null);
        }
      } else {
        fetchErrorMsg = `Google Sheets API returned status ${res.status}`;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      fetchErrorMsg = `API Fetch Error: ${msg}`;
    }
  }

  // 3. Fallback to direct CSV export if no records yet
  if (records.length === 0 && !fetchErrorMsg) {
    const csvExportUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${sheetGid}`,
    ];

    for (const exportUrl of csvExportUrls) {
      try {
        const res = await fetch(exportUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          },
          cache: 'no-store',
        });
        
        if (res.ok) {
          const csvText = await res.text();
          const rawRecords = parseCsvToRawRecords(csvText);
          const parsed = rawRecords
            .map((raw, idx) => normalizeRecord(raw, idx))
            .filter((r): r is ProcessedRecord => r !== null);

          if (parsed.length > 0) {
            records = parsed;
            fetchErrorMsg = undefined;
            break;
          }
        } else if (res.status === 401 || res.status === 403) {
          fetchErrorMsg = `Google Sheet access denied (${res.status}). Ensure sheet is shared with: ${serviceAccountEmail || 'Service Account'}`;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fetchErrorMsg = `Direct fetch failed: ${msg}`;
      }
    }
  }

  // Sort chronologically ascending
  records.sort((a, b) => a.timestamp - b.timestamp);

  const lastChecked = records.length > 0 ? records[records.length - 1].dateTimeFormatted : null;

  const responsePayload: PageSpeedApiResponse = {
    records,
    meta: {
      totalRecords: records.length,
      lastChecked,
      isMock: false,
      credentialsConfigured,
      error: fetchErrorMsg,
    },
  };

  return NextResponse.json(responsePayload);
}
