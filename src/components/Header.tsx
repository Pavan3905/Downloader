import React from 'react';
import { Compass, Bookmark, Activity, Sliders, CheckCircle2, Link2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'inspect' | 'queue' | 'saved' | 'settings';
  setActiveTab: (tab: 'inspect' | 'queue' | 'saved' | 'settings') => void;
  activeQueueCount: number;
  savedCount: number;
  onQuickPaste?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeQueueCount,
  savedCount,
  onQuickPaste,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-xl border-b border-neutral-800">
      <div className="max-w-2xl mx-auto px-4 h-15 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => setActiveTab('inspect')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full p-[2px] instagram-gradient flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
              <span className="text-xs font-black tracking-tighter text-white">DL</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white leading-none font-sans">
              Downloader
            </span>
            <span className="text-[10px] text-neutral-400 tracking-wide mt-0.5">
              Media Streamer
            </span>
          </div>
        </button>

        {/* Center Nav Items */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('inspect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'inspect'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Inspect</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'queue'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Queue</span>
            {activeQueueCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full instagram-gradient text-white animate-pulse">
                {activeQueueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'saved'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="text-[10px] text-neutral-400 font-mono">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
            title="Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </nav>

        {/* Right Action */}
        <div className="flex items-center gap-2">
          {onQuickPaste && (
            <button
              onClick={onQuickPaste}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-800 transition-colors"
              title="Paste clipboard link"
            >
              <Link2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Paste</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden lg:inline text-neutral-400">Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};
