import { ProcessedRecord, RawPageSpeedRecord, ScoreReason, TimeRangeType } from '@/types/pagespeed';

/**
 * Parse DD/MM/YYYY and HH:mm into a valid epoch timestamp (ms).
 * Handles leading zeros, single digits, and returns timestamp or NaN.
 */
export function parseDateTimeToEpoch(dateStr: string, timeStr: string): number {
  if (!dateStr) return NaN;
  
  try {
    const dateParts = dateStr.trim().split('/');
    if (dateParts.length !== 3) return NaN;
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // 0-indexed in JS Date
    const year = parseInt(dateParts[2], 10);
    
    let hours = 0;
    let minutes = 0;
    
    if (timeStr) {
      const timeParts = timeStr.trim().split(':');
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
      }
    }
    
    const dateObj = new Date(Date.UTC(year, month, day, hours, minutes));
    return dateObj.getTime();
  } catch (err) {
    return NaN;
  }
}

/**
 * Format timestamp into human readable string (e.g. "02 Aug 2026 • 14:30")
 */
export function formatDateTime(timestamp: number): string {
  if (isNaN(timestamp) || timestamp <= 0) return 'N/A';
  const date = new Date(timestamp);
  
  const day = String(date.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const mins = String(date.getUTCMinutes()).padStart(2, '0');
  
  return `${day} ${month} ${year} • ${hours}:${mins}`;
}

/**
 * Safely parse numeric values. Returns null if missing or invalid.
 */
function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === 'N/A') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/**
 * Flexible field value extractor that handles truncated or slightly different column names in Google Sheets.
 */
function getRawField(raw: Record<string, unknown>, possibleKeys: string[]): unknown {
  const rawKeys = Object.keys(raw);
  
  // 1. Direct match
  for (const k of possibleKeys) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') {
      return raw[k];
    }
  }

  // 2. Case-insensitive & prefix match (e.g., Performance_Sc matching Performance_Score)
  for (const candidateKey of possibleKeys) {
    const candidateLower = candidateKey.toLowerCase();
    for (const actualKey of rawKeys) {
      const actualLower = actualKey.toLowerCase().trim();
      if (
        actualLower === candidateLower ||
        actualLower.startsWith(candidateLower.slice(0, 10)) ||
        candidateLower.startsWith(actualLower.slice(0, 10))
      ) {
        if (raw[actualKey] !== undefined && raw[actualKey] !== null && raw[actualKey] !== '') {
          return raw[actualKey];
        }
      }
    }
  }

  return null;
}

/**
 * Parse Score_Reason safely from array or JSON string.
 */
function parseScoreReasons(raw: unknown): ScoreReason[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      reason: String(item.reason || item.title || 'Performance Opportunity'),
      estimated_savings: item.estimated_savings ? String(item.estimated_savings) : undefined,
    }));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parseScoreReasons(parsed);
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Normalize raw record into ProcessedRecord.
 */
export function normalizeRecord(raw: RawPageSpeedRecord, index: number): ProcessedRecord | null {
  if (!raw) return null;

  const rawObj = raw as unknown as Record<string, unknown>;

  const dateStr = String(getRawField(rawObj, ['date', 'Date']) || '').trim();
  const timeStr = String(getRawField(rawObj, ['time', 'Time']) || '00:00').trim();

  if (!dateStr) return null;

  const timestamp = parseDateTimeToEpoch(dateStr, timeStr);
  if (isNaN(timestamp)) return null;

  const rawDevice = String(getRawField(rawObj, ['device', 'Device']) || 'mobile').toLowerCase();
  const device: 'mobile' | 'desktop' = rawDevice.includes('desk') ? 'desktop' : 'mobile';

  let pageStr = String(getRawField(rawObj, ['page', 'Page']) || 'Homepage').trim();
  // Map common page name variations to canonical options
  if (pageStr.toLowerCase().includes('home')) pageStr = 'Homepage';
  else if (pageStr.toLowerCase().includes('search')) pageStr = 'Search Page';
  else if (pageStr.toLowerCase().includes('pdp') || pageStr.toLowerCase().includes('product')) pageStr = 'PDP';
  else if (pageStr.toLowerCase().includes('company')) pageStr = 'Company Page';

  const rawUrl = String(getRawField(rawObj, ['url', 'URL']) || 'https://export.indiamart.com/').trim();

  const perfVal = parseNumeric(getRawField(rawObj, ['Performance_Score', 'Performance_Sc', 'Performance', 'Perf_Score']));
  const accessVal = parseNumeric(getRawField(rawObj, ['Accessibility_Score', 'Accessibility_So', 'Accessibility']));
  const bestVal = parseNumeric(getRawField(rawObj, ['Best_Practices_Score', 'Best_Practices_Sc', 'Best_Practices']));
  
  const lcpVal = parseNumeric(getRawField(rawObj, ['LCP', 'lcp']));
  const fcpVal = parseNumeric(getRawField(rawObj, ['FCP', 'fcp']));
  const tbtVal = parseNumeric(getRawField(rawObj, ['TBT', 'tbt']));
  const siVal = parseNumeric(getRawField(rawObj, ['SI', 'si', 'Speed_Index']));
  const clsVal = parseNumeric(getRawField(rawObj, ['CLS', 'cls']));

  const scoreReasonRaw = getRawField(rawObj, ['Score_Reason', 'ScoreReasons', 'score_reason']);

  return {
    id: `rec-${index}-${timestamp}`,
    timestamp,
    dateTimeFormatted: formatDateTime(timestamp),
    date: dateStr,
    time: timeStr,
    page: pageStr,
    url: rawUrl,
    device,
    Performance_Score: perfVal,
    Accessibility_Score: accessVal,
    Best_Practices_Score: bestVal,
    LCP: lcpVal,
    FCP: fcpVal,
    TBT: tbtVal,
    SI: siVal,
    CLS: clsVal,
    Score_Reason: parseScoreReasons(scoreReasonRaw),
  };
}

/**
 * Filter records by Time Range relative to the max dataset timestamp or current time.
 */
export function filterRecordsByTimeRange(records: ProcessedRecord[], range: TimeRangeType): ProcessedRecord[] {
  if (!records.length) return [];
  
  // Sort chronologically ascending first
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  
  const latestTimestamp = sorted[sorted.length - 1].timestamp;
  let hoursLimit = 24;
  
  switch (range) {
    case '6H':
      hoursLimit = 6;
      break;
    case '12H':
      hoursLimit = 12;
      break;
    case '24H':
      hoursLimit = 24;
      break;
    case '7D':
      hoursLimit = 24 * 7;
      break;
    case '30D':
      hoursLimit = 24 * 30;
      break;
  }

  const cutoff = latestTimestamp - hoursLimit * 60 * 60 * 1000;
  return sorted.filter((r) => r.timestamp >= cutoff);
}

/**
 * Metric formatting functions
 */
export function formatMetricDisplay(value: number | null, unit: 'score' | 'seconds' | 'ms' | 'decimal'): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  switch (unit) {
    case 'score':
      return Math.round(value).toString();
    case 'seconds':
      // Source value is in milliseconds (e.g., 3307.5 ms -> 3.31s)
      return `${(value / 1000).toFixed(2)}s`;
    case 'ms':
      return `${Math.round(value)}ms`;
    case 'decimal':
      return value.toFixed(2);
    default:
      return String(value);
  }
}

export function formatDeltaDisplay(delta: number, unit: 'score' | 'seconds' | 'ms' | 'decimal'): string {
  const absDelta = Math.abs(delta);
  switch (unit) {
    case 'score':
      return `${Math.round(absDelta)}`;
    case 'seconds':
      return `${(absDelta / 1000).toFixed(2)}s`;
    case 'ms':
      return `${Math.round(absDelta)}ms`;
    case 'decimal':
      return absDelta.toFixed(2);
    default:
      return absDelta.toFixed(2);
  }
}

/**
 * Generates initial rich realistic sample dataset for fallback when Google Sheet credentials are not configured or direct fetch is unauthorized.
 */
export function generateFallbackDataset(): ProcessedRecord[] {
  const pages: Array<{ name: string; url: string }> = [
    { name: 'Homepage', url: 'https://export.indiamart.com/' },
    { name: 'Search Page', url: 'https://export.indiamart.com/search.php?ss=diamond' },
    { name: 'PDP', url: 'https://export.indiamart.com/proddetail/diamond-ring-100234.html' },
    { name: 'Company Page', url: 'https://export.indiamart.com/company/abc-exports/' },
  ];

  const devices: Array<'mobile' | 'desktop'> = ['mobile', 'desktop'];
  
  const records: ProcessedRecord[] = [];
  const baseTime = new Date(Date.UTC(2026, 7, 2, 14, 30)).getTime(); // 02 Aug 2026 14:30
  const stepMs = 3 * 60 * 60 * 1000; // test every 3 hours
  const totalPoints = 56; // 7 days * 8 tests/day

  let idCounter = 1;

  for (let i = totalPoints - 1; i >= 0; i--) {
    const time = baseTime - i * stepMs;
    const dateObj = new Date(time);
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const year = dateObj.getUTCFullYear();
    const hours = String(dateObj.getUTCHours()).padStart(2, '0');
    const mins = String(dateObj.getUTCMinutes()).padStart(2, '0');
    
    const dateStr = `${day}/${month}/${year}`;
    const timeStr = `${hours}:${mins}`;

    for (const dev of devices) {
      for (const p of pages) {
        const isMobile = dev === 'mobile';
        
        const basePerf = isMobile ? (p.name === 'Search Page' ? 77 : p.name === 'Homepage' ? 82 : p.name === 'PDP' ? 71 : 85) : (p.name === 'Search Page' ? 89 : 94);
        const noise = (Math.sin(i * 0.5) * 4) + ((i % 3) - 1);
        
        const perfScore = Math.min(100, Math.max(40, Math.round(basePerf + noise)));
        const lcp = Math.round((isMobile ? 3200 : 1800) + noise * -80 + (i % 5) * 50);
        const fcp = Math.round((isMobile ? 1200 : 750) + noise * -30);
        const tbt = Math.round((isMobile ? 520 : 180) + noise * -15);
        const si = Math.round((isMobile ? 3500 : 2100) + noise * -60);
        const cls = Number(((isMobile ? 0.02 : 0.01) + (i % 4 === 0 ? 0.03 : 0)).toFixed(2));

        const reasons: ScoreReason[] = [];
        if (perfScore < 85) {
          reasons.push(
            { reason: 'Reduce unused JavaScript', estimated_savings: `Est savings of ${Math.round(300 + noise * 20)} KiB` },
            { reason: 'Improve image delivery', estimated_savings: `Est savings of ${Math.round(40 + noise * 5)} KiB` }
          );
        }

        records.push({
          id: `fallback-${idCounter++}`,
          timestamp: time,
          dateTimeFormatted: formatDateTime(time),
          date: dateStr,
          time: timeStr,
          page: p.name,
          url: p.url,
          device: dev,
          Performance_Score: perfScore,
          Accessibility_Score: Math.min(100, 90 + (i % 5)),
          Best_Practices_Score: Math.min(100, 95 + (i % 3)),
          LCP: lcp,
          FCP: fcp,
          TBT: tbt,
          SI: si,
          CLS: cls,
          Score_Reason: reasons,
        });
      }
    }
  }

  return records;
}
