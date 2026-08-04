'use client';

import React from 'react';
import { TimeRangeType } from '@/types/pagespeed';
import { Clock } from 'lucide-react';

interface TimeRangeSelectorProps {
  selected: TimeRangeType;
  onChange: (range: TimeRangeType) => void;
  theme?: 'dark' | 'light';
}

const RANGES: TimeRangeType[] = ['6H', '12H', '24H', '7D', '30D'];

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onChange, theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`flex items-center gap-1 p-1 rounded-xl transition-colors ${
        isLight
          ? 'bg-slate-200/70 border border-slate-300/80 shadow-inner'
          : 'bg-slate-900/80 border border-slate-800 backdrop-blur-md'
      }`}
    >
      <div className={`flex items-center px-2.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
        <Clock className="w-3.5 h-3.5" />
      </div>
      {RANGES.map((r) => {
        const isSelected = selected === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              isSelected
                ? isLight
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20 ring-1 ring-teal-600'
                  : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                : isLight
                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
};
