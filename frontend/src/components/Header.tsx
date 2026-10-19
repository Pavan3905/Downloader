import React from 'react';
import { Sun, Moon, Sliders, ArrowDownToLine } from 'lucide-react';

interface HeaderProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme = 'dark',
  onToggleTheme,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/75 dark:bg-black/75 backdrop-blur-xl border-b border-zinc-800/60 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-100 shadow-sm">
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Downloader
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Preferences Drawer */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Preferences"
              aria-label="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* Theme toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
