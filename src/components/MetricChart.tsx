'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ProcessedRecord, MetricDefinition } from '@/types/pagespeed';
import { formatDeltaDisplay } from '@/lib/pagespeed';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface MetricChartProps {
  definition: MetricDefinition;
  records: ProcessedRecord[];
  theme?: 'dark' | 'light';
}

export const MetricChart: React.FC<MetricChartProps> = ({ definition, records, theme = 'dark' }) => {
  const { key, title, unit, higherIsBetter, formatValue, formatRawValue } = definition;

  const isLight = theme === 'light';

  // Filter records that have valid numerical data for this metric
  const validRecords = records.filter(
    (r) => r[key] !== null && r[key] !== undefined && !isNaN(r[key] as number)
  );

  const latestRecord = validRecords.length > 0 ? validRecords[validRecords.length - 1] : null;
  const previousRecord = validRecords.length > 1 ? validRecords[validRecords.length - 2] : null;

  const latestVal = latestRecord ? (latestRecord[key] as number) : null;
  const previousVal = previousRecord ? (previousRecord[key] as number) : null;

  let delta: number | null = null;
  let isImproved = false;
  let isDegraded = false;

  if (latestVal !== null && previousVal !== null) {
    delta = latestVal - previousVal;
    if (Math.abs(delta) > 0.0001) {
      if (higherIsBetter) {
        isImproved = delta > 0;
        isDegraded = delta < 0;
      } else {
        // Lower is better
        isImproved = delta < 0;
        isDegraded = delta > 0;
      }
    }
  }

  // Format chart data for Recharts
  const chartData = validRecords.map((r) => ({
    time: r.time,
    dateTimeFormatted: r.dateTimeFormatted,
    rawVal: r[key] as number,
    displayVal: unit === 'seconds' ? (r[key] as number) / 1000 : (r[key] as number),
  }));

  // Chart stroke color based on metric & theme
  const strokeColor = isDegraded
    ? '#f43f5e'
    : isImproved
    ? (isLight ? '#0d9488' : '#10b981')
    : (isLight ? '#1d8480' : '#3b82f6');

  return (
    <div
      className={`flex flex-col justify-between p-5 border rounded-2xl shadow-md transition-all duration-200 ${
        isLight
          ? 'bg-white border-slate-200/90 hover:border-slate-300 shadow-slate-200/50 text-slate-900'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80 text-slate-100 backdrop-blur-md'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {title}
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              {formatValue(latestVal)}
            </span>
          </div>
        </div>

        {/* Delta Comparison Pill */}
        {delta !== null ? (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isImproved
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-400'
                : isDegraded
                ? isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-rose-950/70 border-rose-800/80 text-rose-400'
                : isLight
                ? 'bg-slate-100 border-slate-300 text-slate-600'
                : 'bg-slate-800/70 border-slate-700/80 text-slate-400'
            }`}
          >
            {isImproved ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : isDegraded ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            <span>
              {delta > 0 ? '↑' : delta < 0 ? '↓' : ''}{' '}
              {formatDeltaDisplay(delta, unit)} from previous test
            </span>
          </div>
        ) : (
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-500'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
            }`}
          >
            No baseline
          </div>
        )}
      </div>

      {/* Recharts Container */}
      <div className="h-44 w-full mt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} vertical={false} />
              <XAxis
                dataKey="time"
                stroke={isLight ? '#64748b' : '#64748b'}
                tick={{ fontSize: 10, fill: isLight ? '#475569' : '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: isLight ? '#cbd5e1' : '#334155' }}
              />
              <YAxis
                stroke={isLight ? '#64748b' : '#64748b'}
                tick={{ fontSize: 10, fill: isLight ? '#475569' : '#64748b' }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        className={`p-3 border rounded-xl shadow-xl text-xs font-sans ${
                          isLight
                            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
                            : 'bg-slate-950/95 border-slate-700 text-slate-100 backdrop-blur-md'
                        }`}
                      >
                        <div className={isLight ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium'}>
                          {data.dateTimeFormatted}
                        </div>
                        <div
                          className={`mt-1 text-sm font-bold flex items-center justify-between gap-3 ${
                            isLight ? 'text-slate-900' : 'text-slate-100'
                          }`}
                        >
                          <span>{title}:</span>
                          <span className={isLight ? 'text-[#1d8480]' : 'text-indigo-400'}>
                            {formatValue(data.rawVal)}
                          </span>
                        </div>
                        <div className={`mt-0.5 text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                          Raw value: {formatRawValue(data.rawVal)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="displayVal"
                stroke={strokeColor}
                strokeWidth={2.5}
                dot={chartData.length < 15 ? { r: 3, fill: strokeColor } : false}
                activeDot={{ r: 5, fill: strokeColor, stroke: isLight ? '#ffffff' : '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className={`h-full flex flex-col items-center justify-center gap-1.5 text-xs font-medium rounded-xl border border-dashed ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-500'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
            }`}
          >
            <AlertCircle className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
            <span>Data not available</span>
          </div>
        )}
      </div>
    </div>
  );
};
