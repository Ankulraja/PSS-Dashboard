'use client';

import React from 'react';
import { PageType } from '@/types/pagespeed';
import { Home, Search, ShoppingBag, Building2 } from 'lucide-react';

interface PageSelectorProps {
  selected: PageType;
  onChange: (page: PageType) => void;
  theme?: 'dark' | 'light';
}

const PAGES: Array<{ id: PageType; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'Homepage', label: 'Homepage', icon: Home },
  { id: 'Search Page', label: 'Search Page', icon: Search },
  { id: 'PDP', label: 'PDP', icon: ShoppingBag },
  { id: 'Company Page', label: 'Company Page', icon: Building2 },
];

export const PageSelector: React.FC<PageSelectorProps> = ({ selected, onChange, theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl transition-colors ${
        isLight
          ? 'bg-slate-200/70 border border-slate-300/80 shadow-inner'
          : 'bg-slate-900/80 border border-slate-800 backdrop-blur-md'
      }`}
    >
      {PAGES.map((p) => {
        const Icon = p.icon;
        const isSelected = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isSelected
                ? isLight
                  ? 'bg-[#2e3192] text-white shadow-md shadow-[#2e3192]/25 ring-1 ring-[#2e3192]'
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400'
                : isLight
                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
};
