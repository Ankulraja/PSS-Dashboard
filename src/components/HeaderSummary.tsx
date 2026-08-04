'use client';

import React from 'react';
import { DeviceType, PageType } from '@/types/pagespeed';
import { Globe, Clock, Smartphone, Monitor, AlertTriangle } from 'lucide-react';

interface HeaderSummaryProps {
  device: DeviceType;
  page: PageType;
  url?: string;
  lastChecked?: string | null;
  isMock?: boolean;
  credentialsConfigured?: boolean;
  errorMsg?: string;
  theme?: 'dark' | 'light';
}

export const HeaderSummary: React.FC<HeaderSummaryProps> = ({
  device,
  page,
  url = 'https://export.indiamart.com/',
  lastChecked,
  errorMsg,
  theme = 'dark',
}) => {
  const isMobile = device === 'mobile';
  const isLight = theme === 'light';

  return (
    <div className="flex flex-col gap-4">
      {/* Connection Notice / Error Banner */}
      {errorMsg && (
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-2xl text-xs sm:text-sm backdrop-blur-md ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
            <div>
              <span className={`font-semibold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                Google Sheet Connection Notice:
              </span>{' '}
              {errorMsg}
            </div>
          </div>
        </div>
      )}

      {/* Main Info Card */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border rounded-2xl shadow-md transition-colors ${
          isLight
            ? 'bg-white border-slate-200 shadow-slate-200/50 text-slate-900'
            : 'bg-slate-900/90 border-slate-800 text-slate-100 backdrop-blur-md'
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            {isMobile ? (
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                  isLight
                    ? 'bg-teal-50 border-teal-200 text-[#1d8480]'
                    : 'bg-indigo-950/70 border-indigo-800/60 text-indigo-400'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </span>
            ) : (
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                  isLight
                    ? 'bg-blue-50 border-blue-200 text-[#2e3192]'
                    : 'bg-indigo-950/70 border-indigo-800/60 text-indigo-400'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </span>
            )}
            <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{page}</span>
          </div>

          <div className="flex items-center gap-2 text-sm sm:text-base font-mono truncate max-w-xl">
            <Globe className={`w-4 h-4 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:underline truncate font-medium ${
                isLight ? 'text-[#1d8480] hover:text-[#166a67]' : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              {url}
            </a>
          </div>
        </div>

        {/* Right Stats */}
        <div className={`flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex flex-col text-right sm:text-left">
            <span className={`text-xs font-medium flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <Clock className="w-3.5 h-3.5 opacity-70" /> Last checked:
            </span>
            <span className={`text-sm font-semibold mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              {lastChecked || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
