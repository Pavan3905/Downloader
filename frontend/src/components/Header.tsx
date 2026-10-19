import React from 'react';
import { Sun, Moon, ArrowDownToLine } from 'lucide-react';

interface HeaderProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme = 'dark',
  onToggleTheme,
}) => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Mark (Click to scroll to top) */}
        <button
          type="button"
          onClick={handleScrollToTop}
          className="group flex items-center gap-2.5 select-none text-left bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
          title="Downloader - Home"
          aria-label="Downloader Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
            <ArrowDownToLine className="w-4 h-4 stroke-[2.3] group-hover:translate-y-0.5 transition-transform duration-200" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Downloader
          </span>
        </button>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:shadow-md flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer active:scale-95"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle color theme"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400 stroke-[2.2]" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};

