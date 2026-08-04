'use client';

import React from 'react';
import { ScoreReason } from '@/types/pagespeed';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';

interface PerformanceIssuesProps {
  reasons?: ScoreReason[];
  pageName?: string;
  deviceName?: string;
  theme?: 'dark' | 'light';
}

export const PerformanceIssues: React.FC<PerformanceIssuesProps> = ({
  reasons = [],
  pageName = 'Homepage',
  deviceName = 'Mobile',
  theme = 'dark',
}) => {
  const hasIssues = reasons.length > 0;
  const isLight = theme === 'light';

  return (
    <div
      className={`flex flex-col gap-4 p-6 border rounded-2xl shadow-md transition-all ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
          : 'bg-slate-900/90 border-slate-800 text-slate-100 backdrop-blur-md'
      }`}
    >
      <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border ${
              isLight
                ? 'bg-teal-50 border-teal-200 text-[#1d8480]'
                : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-400'
            }`}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Latest Performance Issues
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Audit opportunities for {pageName} ({deviceName})
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            hasIssues
              ? isLight
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
              : isLight
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
          }`}
        >
          {hasIssues ? `${reasons.length} Opportunities` : 'Optimal Performance'}
        </span>
      </div>

      {hasIssues ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-1">
          {reasons.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-4 border rounded-xl transition-all duration-200 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80 text-slate-200'
              }`}
            >
              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <div className="flex flex-col gap-0.5">
                <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {item.reason}
                </span>
                {item.estimated_savings && (
                  <span className={`text-xs font-medium font-mono ${isLight ? 'text-[#166a67]' : 'text-emerald-400'}`}>
                    {item.estimated_savings.startsWith('Est')
                      ? item.estimated_savings
                      : `Estimated savings: ${item.estimated_savings}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`flex items-center gap-3 p-6 border rounded-xl ${
            isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
          <span className="text-sm font-semibold">No significant performance issues detected.</span>
        </div>
      )}
    </div>
  );
};
