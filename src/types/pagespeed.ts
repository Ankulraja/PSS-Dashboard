export interface ScoreReason {
  reason: string;
  estimated_savings?: string;
}

export interface RawPageSpeedRecord {
  date: string;
  time: string;
  page: string;
  url: string;
  device: string;
  Performance_Score?: number | string | null;
  Accessibility_Score?: number | string | null;
  Best_Practices_Score?: number | string | null;
  LCP?: number | string | null;
  FCP?: number | string | null;
  TBT?: number | string | null;
  SI?: number | string | null;
  CLS?: number | string | null;
  Score_Reason?: ScoreReason[] | string | null;
}

export interface ProcessedRecord {
  id: string;
  timestamp: number; // epoch ms
  dateTimeFormatted: string;
  date: string;
  time: string;
  page: string;
  url: string;
  device: 'mobile' | 'desktop';
  Performance_Score: number | null;
  Accessibility_Score: number | null;
  Best_Practices_Score: number | null;
  LCP: number | null; // ms
  FCP: number | null; // ms
  TBT: number | null; // ms
  SI: number | null;  // ms
  CLS: number | null; // unitless
  Score_Reason: ScoreReason[];
}

export type DeviceType = 'mobile' | 'desktop';
export type PageType = 'Homepage' | 'Search Page' | 'PDP' | 'Company Page';
export type TimeRangeType = '6H' | '12H' | '24H' | '7D' | '30D';

export interface MetricDefinition {
  key: keyof Pick<ProcessedRecord, 'Performance_Score' | 'LCP' | 'FCP' | 'TBT' | 'SI' | 'CLS'>;
  title: string;
  unit: 'score' | 'seconds' | 'ms' | 'decimal';
  higherIsBetter: boolean;
  formatValue: (val: number | null) => string;
  formatRawValue: (val: number | null) => string;
}

export interface PageSpeedApiResponse {
  records: ProcessedRecord[];
  meta: {
    totalRecords: number;
    lastChecked: string | null;
    isMock: boolean;
    credentialsConfigured: boolean;
    error?: string;
  };
}
