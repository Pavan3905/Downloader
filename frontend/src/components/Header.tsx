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
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-black/40 backdrop-blur-xl border-b border-white/[0.06] transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[52px] flex items-center justify-between">
        {/* Brand Mark (Click to scroll to top) */}
        <button
          type="button"
          onClick={handleScrollToTop}
          className="group flex items-center gap-2.5 select-none text-left bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
          title="Clipstream - Home"
          aria-label="Clipstream Home"
        >
          <div className="brand-tile w-7 h-7 rounded-lg bg-zinc-900/90 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/30 group-hover:bg-zinc-800 transition-all duration-200 shadow-sm">
            <ArrowDownToLine className="w-3.5 h-3.5 stroke-[2.2] group-hover:translate-y-0.5 transition-transform duration-200" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-colors font-sans">
              Clipstream
            </span>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
              title="Edge Engine Ready"
            />
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Preferences Drawer */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="nav-btn w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] active:scale-95 transition-all cursor-pointer"
              title="Preferences & Audio Options"
              aria-label="Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Theme toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="nav-btn w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] active:scale-95 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

