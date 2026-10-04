import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/70 backdrop-blur-xl border-b border-neutral-800/60">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 rounded-lg p-[2px] instagram-gradient flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-black rounded-[6px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </div>
          </div>
          <span className="text-base font-bold tracking-tight text-white leading-none">
            Downloader
          </span>
        </div>

        {/* Theme toggle */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
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
    </header>
  );
};
