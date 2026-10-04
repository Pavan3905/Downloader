import React from 'react';
import { Sliders, CheckCircle2, RotateCcw, ShieldCheck, HardDrive } from 'lucide-react';
import { AdvancedSettings, SystemHealth } from '../types';

interface SettingsSheetProps {
  settings: AdvancedSettings;
  setSettings: React.Dispatch<React.SetStateAction<AdvancedSettings>>;
  health: SystemHealth | null;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  settings,
  setSettings,
  health,
}) => {
  const handleReset = () => {
    setSettings({
      subtitle_mode: 'off',
      subtitle_languages: 'en.*,en',
      subtitle_format: 'best',
      thumbnail_mode: 'embed',
      metadata_mode: 'embed',
      embed_chapters: true,
      filename_template: '%(title).180B [%(id)s].%(ext)s',
      merge_output_format: 'auto',
      custom_format_selector: '',
      playlist_items: '',
      limit_rate: '',
      retries: 10,
      fragment_retries: 10,
      concurrent_fragments: 4,
      socket_timeout: 30,
      cookies_from_browser: '',
      proxy: '',
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-semibold text-white">App Preferences</h2>
          <p className="text-xs text-neutral-400">
            Tune download defaults and storage preferences
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Filename Template */}
        <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-2">
          <label className="text-xs font-semibold text-white block">
            Filename Template
          </label>
          <p className="text-[11px] text-neutral-400">
            Customize how downloaded files are saved on disk.
          </p>
          <input
            type="text"
            value={settings.filename_template}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, filename_template: e.target.value }))
            }
            className="w-full h-10 px-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-neutral-600"
          />
        </div>

        {/* Speed / Rate Limiting */}
        <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-2">
          <label className="text-xs font-semibold text-white block">
            Download Rate Limit
          </label>
          <p className="text-[11px] text-neutral-400">
            Leave blank for maximum network speed, or enter e.g. 5M or 500K.
          </p>
          <input
            type="text"
            placeholder="No limit (maximum speed)"
            value={settings.limit_rate}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, limit_rate: e.target.value }))
            }
            className="w-full h-10 px-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-600"
          />
        </div>

        {/* Concurrent fragments & Retries */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-2">
            <label className="text-xs font-semibold text-white block">
              Parallel Streams
            </label>
            <select
              value={settings.concurrent_fragments}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  concurrent_fragments: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-10 px-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value={2}>2 streams</option>
              <option value={4}>4 streams (recommended)</option>
              <option value={8}>8 streams (fastest)</option>
            </select>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-2">
            <label className="text-xs font-semibold text-white block">
              Retry Attempts
            </label>
            <select
              value={settings.retries}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  retries: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-10 px-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value={5}>5 retries</option>
              <option value={10}>10 retries (standard)</option>
              <option value={20}>20 retries</option>
            </select>
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Engine Diagnostics</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60 flex items-center justify-between">
              <span>Media Engine</span>
              <span className="text-white font-medium">Node.js 22</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60 flex items-center justify-between">
              <span>FFmpeg Encoder</span>
              <span className="text-emerald-400 font-medium">Active</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60 flex items-center justify-between">
              <span>Output Directory</span>
              <span className="text-neutral-300 font-mono text-[10px]">downloads/</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60 flex items-center justify-between">
              <span>Version</span>
              <span className="text-neutral-300 font-medium">{health?.app_version || '1.4.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
