'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ProcessedRecord, MetricDefinition, DeviceType, TimeRangeType } from '@/types/pagespeed';
import {
  aggregateDailyP75Records,
  computePercentile,
  detectIsolatedOutliers,
  formatAxisTime,
  formatDeltaDisplay,
} from '@/lib/pagespeed';
import { getMetricRating, getRatingColors, getRatingHex } from '@/data/metricThresholds';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface MetricChartProps {
  definition: MetricDefinition;
  records: ProcessedRecord[];
  theme?: 'dark' | 'light';
  device?: DeviceType;
  timeRange?: TimeRangeType;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  definition,
  records,
  theme = 'dark',
  device = 'mobile',
  timeRange = '1D',
}) => {
  const { key, title, unit, higherIsBetter, formatValue, formatRawValue, outlierMultiplier } =
    definition;

  const isLight = theme === 'light';

  // ── Step 1: filter to records that have a valid value for this metric ──────
  // ── Step 2: run isolated-spike detection per metric ───────────────────────
  const taggedRecords = useMemo(() => {
    const valid = records.filter(
      (r) => r[key] !== null && r[key] !== undefined && !isNaN(r[key] as number)
    );
    return detectIsolatedOutliers(valid, key, outlierMultiplier);
  }, [records, key, outlierMultiplier]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  // For 7D (7 points) and 30D (up to 30 points): day-wise P75 aggregation.
  // For 6H, 12H, 1D: individual test runs with approx 1h X-axis time marks.
  const isDailyRange = timeRange === '7D' || timeRange === '30D';
  const maxDays = timeRange === '7D' ? 7 : 30;

  const chartData = useMemo(() => {
    if (isDailyRange) {
      return aggregateDailyP75Records(
        taggedRecords,
        key,
        higherIsBetter,
        unit,
        maxDays
      );
    }

    return taggedRecords.map((r) => {
      const rawVal = r[key] as number;
      const scaledVal = unit === 'seconds' ? rawVal / 1000 : rawVal;
      const axisTime = formatAxisTime(r.time, r.date, timeRange);
      return {
        time: r.time,
        axisTime,
        dateTimeFormatted: r.dateTimeFormatted,
        rawVal,
        isOutlier: r.isOutlier,
        displayVal: r.isOutlier ? null : scaledVal,
        testCount: 1,
        isDailyAggregate: false,
      };
    });
  }, [taggedRecords, key, unit, timeRange, isDailyRange, higherIsBetter, maxDays]);

  // Clean plotted points currently shown on the chart
  const currentPoints = useMemo(() => {
    return chartData.filter((d) => !d.isOutlier && d.rawVal !== null && !isNaN(d.rawVal));
  }, [chartData]);

  const currentPointValues = useMemo(() => {
    return currentPoints.map((d) => d.rawVal);
  }, [currentPoints]);

  // ── Max & Min of the currently plotted points on the chart ─────────────────
  const maxVal = currentPointValues.length > 0 ? Math.max(...currentPointValues) : null;
  const minVal = currentPointValues.length > 0 ? Math.min(...currentPointValues) : null;

  // Latest and previous point on the chart
  const latestPoint = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : null;
  const previousPoint = currentPoints.length > 1 ? currentPoints[currentPoints.length - 2] : null;
  const latestVal = latestPoint ? latestPoint.rawVal : null;
  const previousVal = previousPoint ? previousPoint.rawVal : null;

  // ── 75th Percentile (P75) calculation from current plotted points ──────────
  const sortedCurrentPointValues = useMemo(() => {
    return [...currentPointValues].sort((a, b) => a - b);
  }, [currentPointValues]);

  const p75Val = useMemo(() => {
    if (sortedCurrentPointValues.length === 0) return null;
    const percentileRank = higherIsBetter ? 25 : 75;
    return computePercentile(sortedCurrentPointValues, percentileRank);
  }, [sortedCurrentPointValues, higherIsBetter]);

  // Rating for P75 headline score (Green = Good, Yellow = Needs Improvement, Red = Poor)
  const rating = p75Val !== null ? getMetricRating(key, p75Val, device) : null;
  const ratingColors = rating ? getRatingColors(rating, theme) : null;

  // Number of isolated spikes detected — kept for internal logic only
  const outlierCount = taggedRecords.filter((r) => r.isOutlier).length;
  void outlierCount; // suppress unused-var warning — badge removed

  // ── Delta / trend calculation (between latest test and previous test) ──────
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
        isImproved = delta < 0;
        isDegraded = delta > 0;
      }
    }
  }

  // How many clean points — drives whether dots are shown on the main line
  const cleanPointCount = chartData.filter((d) => !d.isOutlier).length;

  // ── Stroke colour based on metric performance range (Green / Yellow / Red) ──
  const strokeColor = rating
    ? getRatingHex(rating, theme)
    : isLight
      ? '#1d8480'
      : '#3b82f6';

  // ── Shared tooltip content ────────────────────────────────────────────────
  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    const isSpike = data.isOutlier;
    const isDaily = data.isDailyAggregate;
    const pointRating =
      data.rawVal !== null && !isSpike ? getMetricRating(key, data.rawVal, device) : null;
    const pointColors = pointRating ? getRatingColors(pointRating, theme) : null;

    return (
      <div
        className={`p-3 border rounded-xl shadow-xl text-xs font-sans ${isLight
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
            : 'bg-slate-950/95 border-slate-700 text-slate-100 backdrop-blur-md'
          }`}
      >
        <div className={`font-medium mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {data.dateTimeFormatted} {isDaily && data.testCount ? `• ${data.testCount} tests` : ''}
        </div>

        <div
          className={`text-sm font-bold flex items-center justify-between gap-3 ${isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
        >
          <span>{title} {isDaily ? '(Daily P75)' : ''}:</span>
          <span
            className={
              isSpike
                ? isLight
                  ? 'text-slate-400'
                  : 'text-slate-500'
                : pointColors
                  ? pointColors.text
                  : isLight
                    ? 'text-[#1d8480]'
                    : 'text-indigo-400'
            }
          >
            {formatValue(data.rawVal)}
          </span>
        </div>

        <div className={`mt-0.5 text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
          {isDaily ? `Day P75: ${formatRawValue(data.rawVal)}` : `Raw: ${formatRawValue(data.rawVal)}`}
        </div>

        {isSpike && (
          <div
            className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-md border ${isLight
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-amber-950/50 text-amber-400 border-amber-800/50'
              }`}
          >
            <span>⚠</span>
            <span>Isolated spike — possible test noise</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col justify-between p-5 border rounded-2xl shadow-md transition-all duration-200 ${isLight
          ? 'bg-white border-slate-200/90 hover:border-slate-300 shadow-slate-200/50 text-slate-900'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80 text-slate-100 backdrop-blur-md'
        }`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
            >
              {title}
            </h3>

            {ratingColors && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ratingColors.bg} ${ratingColors.text} ${ratingColors.border}`}
              >
                {ratingColors.label}
              </span>
            )}
          </div>

          {/* Primary P75 Headline value + Latest + Max / Min — all on one line */}
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl font-extrabold tracking-tight ${ratingColors ? ratingColors.text : isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}
              >
                {formatValue(p75Val)}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}
                title="75th Percentile across selected time range"
              >
                (P75)
              </span>
            </div>

            {(latestVal !== null || maxVal !== null || minVal !== null) && (
              <span className={`flex items-center gap-2 text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>
                {latestVal !== null && (
                  <span className="flex items-center gap-1">
                    <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>Latest:</span>
                    <span className={isLight ? 'text-slate-700' : 'text-slate-200'}>{formatValue(latestVal)}</span>
                  </span>
                )}
                {latestVal !== null && (maxVal !== null || minVal !== null) && (
                  <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>·</span>
                )}
                {maxVal !== null && (
                  <span className="flex items-center gap-1">
                    <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>↑ Max</span>
                    <span className={isLight ? 'text-slate-700' : 'text-slate-200'}>{formatValue(maxVal)}</span>
                  </span>
                )}
                {maxVal !== null && minVal !== null && (
                  <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>·</span>
                )}
                {minVal !== null && (
                  <span className="flex items-center gap-1">
                    <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>↓ Min</span>
                    <span className={isLight ? 'text-slate-700' : 'text-slate-200'}>{formatValue(minVal)}</span>
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* ── Delta pill ──────────────────────────────────────────────────── */}
        {delta !== null ? (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isImproved
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
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono ${isLight
                ? 'bg-slate-100 border-slate-200 text-slate-500'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
              }`}
          >
            No baseline
          </div>
        )}
      </div>

      {/* ── Chart area ────────────────────────────────────────────────────── */}
      <div className="h-44 w-full mt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isLight ? '#e2e8f0' : '#1e293b'}
                vertical={false}
              />
              <XAxis
                dataKey="axisTime"
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
              <Tooltip content={renderTooltip} />

              {/* ── Main trend line ─────────────────────────────────────────
                  displayVal is null for outliers → line skips them.
                  connectNulls=true bridges the gap so the line stays continuous.
              ──────────────────────────────────────────────────────────────── */}
              <Line
                type="monotone"
                dataKey="displayVal"
                stroke={strokeColor}
                strokeWidth={2.5}
                connectNulls={true}
                dot={
                  cleanPointCount <= 31
                    ? { r: 3.5, fill: strokeColor }
                    : false
                }
                activeDot={{
                  r: 5,
                  fill: strokeColor,
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className={`h-full flex flex-col items-center justify-center gap-1.5 text-xs font-medium rounded-xl border border-dashed ${isLight
                ? 'bg-slate-50 border-slate-200 text-slate-500'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
              }`}
          >
            <AlertCircle
              className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}
            />
            <span>Data not available</span>
          </div>
        )}
      </div>
    </div>
  );
};
