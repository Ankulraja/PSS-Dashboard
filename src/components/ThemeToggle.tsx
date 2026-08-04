'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: (newTheme: 'dark' | 'light') => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => onToggle(isDark ? 'light' : 'dark')}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border shadow-sm ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800 hover:text-amber-300'
          : 'bg-white border-slate-200 text-[#1d8480] hover:bg-slate-50 hover:text-[#166a67] shadow-slate-200/50'
      }`}
      title={isDark ? 'Switch to Light Theme (Export Next style)' : 'Switch to Dark Theme'}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#1d8480] fill-[#1d8480]/20" />
          <span className="text-slate-800 font-semibold">Dark Mode</span>
        </>
      )}
    </button>
  );
};
