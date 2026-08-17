'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  DeviceType,
  PageType,
  TimeRangeType,
  ProcessedRecord,
  PageSpeedApiResponse,
  MetricDefinition,
} from '@/types/pagespeed';
import { filterRecordsByTimeRange } from '@/lib/pagespeed';
import { DeviceSelector } from '@/components/DeviceSelector';
import { PageSelector } from '@/components/PageSelector';
import { TimeRangeSelector } from '@/components/TimeRangeSelector';
import { HeaderSummary } from '@/components/HeaderSummary';
import { MetricChart } from '@/components/MetricChart';
import { PerformanceIssues } from '@/components/PerformanceIssues';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Activity, RefreshCw } from 'lucide-react';

const CACHE_KEY = 'PAGESPEED_DASHBOARD_CACHE';
const THEME_KEY = 'PAGESPEED_DASHBOARD_THEME';

const METRICS: MetricDefinition[] = [
  {
    key: 'Performance_Score',
    title: 'Performance Score',
    unit: 'score',
    higherIsBetter: true,
    outlierMultiplier: 2.0, // bounded 0–100; only flag extreme isolated single-point dips
    formatValue: (val) => (val !== null ? `${Math.round(val)}` : 'N/A'),
    formatRawValue: (val) => (val !== null ? `${val} / 100` : 'N/A'),
  },
  {
    key: 'LCP',
    title: 'Largest Contentful Paint (LCP)',
    unit: 'seconds',
    higherIsBetter: false,
    outlierMultiplier: 2.5, // right-skewed; loose fence to catch only extreme isolated spikes
    formatValue: (val) => (val !== null ? `${(val / 1000).toFixed(2)}s` : 'N/A'),
    formatRawValue: (val) => (val !== null ? `${val} ms` : 'N/A'),
  },
  {
    key: 'FCP',
    title: 'First Contentful Paint (FCP)',
    unit: 'seconds',
    higherIsBetter: false,
    outlierMultiplier: 2.5,
    formatValue: (val) => (val !== null ? `${(val / 1000).toFixed(2)}s` : 'N/A'),
    formatRawValue: (val) => (val !== null ? `${val} ms` : 'N/A'),
  },
  {
    key: 'TBT',
    title: 'Total Blocking Time (TBT)',
    unit: 'ms',
    higherIsBetter: false,
    outlierMultiplier: 2.5, // naturally spiky; sustained elevated = real regression not noise
    formatValue: (val) => (val !== null ? `${Math.round(val)}ms` : 'N/A'),
    formatRawValue: (val) => (val !== null ? `${val} ms` : 'N/A'),
  },
  {
    key: 'SI',
    title: 'Speed Index (SI)',
    unit: 'seconds',
    higherIsBetter: false,
    outlierMultiplier: 2.5,
    formatValue: (val) => (val !== null ? `${(val / 1000).toFixed(2)}s` : 'N/A'),
    formatRawValue: (val) => (val !== null ? `${val} ms` : 'N/A'),
  },
  {
    key: 'CLS',
    title: 'Cumulative Layout Shift (CLS)',
    unit: 'decimal',
    higherIsBetter: false,
    outlierMultiplier: 1.5, // small normal range (0.0x); stricter fence catches meaningful jumps
    formatValue: (val) => (val !== null ? val.toFixed(2) : 'N/A'),
    formatRawValue: (val) => (val !== null ? `${val}` : 'N/A'),
  },
];

export default function DashboardPage() {
  const [device, setDevice] = useState<DeviceType>('mobile');
  const [page, setPage] = useState<PageType>('Homepage');
  const [timeRange, setTimeRange] = useState<TimeRangeType>('1D');

  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  const [allRecords, setAllRecords] = useState<ProcessedRecord[]>([]);
  const [meta, setMeta] = useState<PageSpeedApiResponse['meta']>({
    totalRecords: 0,
    lastChecked: null,
    isMock: false,
    credentialsConfigured: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    }
  }, []);

  // Update HTML class when theme changes
  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, newTheme);
      const root = document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (!isManualRefresh && typeof window !== 'undefined') {
      try {
        const cachedStr = sessionStorage.getItem(CACHE_KEY);
        if (cachedStr) {
          const cachedData: PageSpeedApiResponse = JSON.parse(cachedStr);
          if (cachedData && cachedData.records && cachedData.records.length > 0) {
            setAllRecords(cachedData.records);
            setMeta(cachedData.meta);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Ignore cache error
      }
    }

    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const res = await fetch('/api/pagespeed');
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data: PageSpeedApiResponse = await res.json();
      setAllRecords(data.records || []);
      setMeta(data.meta);

      if (typeof window !== 'undefined' && data.records && data.records.length > 0) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // Ignore quota error
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter records for selected device & page (in-memory client side)
  const selectedCombinationRecords = useMemo(() => {
    return allRecords.filter(
      (r) => r.device === device && r.page.toLowerCase() === page.toLowerCase()
    );
  }, [allRecords, device, page]);

  // Filter by selected time range (in-memory client side)
  const filteredTimeRangeRecords = useMemo(() => {
    return filterRecordsByTimeRange(selectedCombinationRecords, timeRange);
  }, [selectedCombinationRecords, timeRange]);

  // Latest record for metadata & performance issues
  const latestRecord = useMemo(() => {
    if (!selectedCombinationRecords.length) return null;
    return selectedCombinationRecords[selectedCombinationRecords.length - 1];
  }, [selectedCombinationRecords]);

  const isLight = theme === 'light';

  return (
    <main
      className={`min-h-screen transition-colors duration-300 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Brand Header */}
      <header className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl shadow-md text-white ${
              isLight
                ? 'bg-gradient-to-tr from-[#1d8480] to-[#166a67] shadow-[#1d8480]/20'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
            }`}
          >
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              PageSpeed Monitor
            </h1>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Real-time Web Vitals & Performance Analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Light / Dark Theme Toggle */}
          <ThemeToggle theme={theme} onToggle={handleThemeChange} />

          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={loading || refreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </header>

      {/* Control Panel: Device Selector & Page Selector */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Device Selector */}
            <DeviceSelector selected={device} onChange={(d) => setDevice(d)} theme={theme} />
            
            {/* Page Selector */}
            <PageSelector selected={page} onChange={(p) => setPage(p)} theme={theme} />
          </div>

          {/* Time Range Selector */}
          <div className="self-start lg:self-auto">
            <TimeRangeSelector selected={timeRange} onChange={(r) => setTimeRange(r)} theme={theme} />
          </div>
        </div>
      </section>

      {/* Page & Device Info Summary */}
      <HeaderSummary
        device={device}
        page={page}
        url={latestRecord?.url}
        lastChecked={latestRecord?.dateTimeFormatted || meta.lastChecked}
        isMock={meta.isMock}
        credentialsConfigured={meta.credentialsConfigured}
        errorMsg={meta.error}
        theme={theme}
      />

      {/* Main Charts Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-64 border rounded-2xl animate-pulse p-6 flex flex-col justify-between ${
                isLight ? 'bg-slate-200/50 border-slate-300/60' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className={`h-6 w-36 rounded-md ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />
              <div className={`h-32 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-800/40'}`} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={`p-8 border rounded-2xl text-center space-y-3 ${isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/40 border-rose-800/60'}`}>
          <div className={`font-bold text-lg ${isLight ? 'text-rose-800' : 'text-rose-400'}`}>Unable to load dashboard data</div>
          <p className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{error}</p>
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Exactly 6 Metric Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {METRICS.map((metricDef) => (
              <MetricChart
                key={metricDef.key}
                definition={metricDef}
                records={filteredTimeRangeRecords}
                theme={theme}
                device={device}
                timeRange={timeRange}
              />
            ))}
          </div>

          {/* Latest Performance Issues Section */}
          <PerformanceIssues
            reasons={latestRecord?.Score_Reason}
            pageName={page}
            deviceName={device === 'mobile' ? 'Mobile' : 'Desktop'}
            theme={theme}
          />
        </>
      )}
    </main>
  );
}
