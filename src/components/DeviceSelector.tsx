'use client';

import React from 'react';
import { DeviceType } from '@/types/pagespeed';
import { Smartphone, Monitor } from 'lucide-react';

interface DeviceSelectorProps {
  selected: DeviceType;
  onChange: (device: DeviceType) => void;
  theme?: 'dark' | 'light';
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({ selected, onChange, theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`flex items-center gap-2 p-1.5 rounded-xl transition-colors ${
        isLight
          ? 'bg-slate-200/70 border border-slate-300/80 shadow-inner'
          : 'bg-slate-900/80 border border-slate-800 backdrop-blur-md'
      }`}
    >
      <button
        type="button"
        onClick={() => onChange('mobile')}
        className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
          selected === 'mobile'
            ? isLight
              ? 'bg-[#1d8480] text-white shadow-md shadow-[#1d8480]/25 ring-1 ring-[#1d8480]'
              : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400'
            : isLight
            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <Smartphone className="w-4 h-4" />
        <span>Mobile</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('desktop')}
        className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
          selected === 'desktop'
            ? isLight
              ? 'bg-[#1d8480] text-white shadow-md shadow-[#1d8480]/25 ring-1 ring-[#1d8480]'
              : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400'
            : isLight
            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <Monitor className="w-4 h-4" />
        <span>Desktop</span>
      </button>
    </div>
  );
};
