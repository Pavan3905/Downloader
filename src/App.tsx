import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InspectPost } from './components/InspectPost';
import { QueueFeed } from './components/QueueFeed';
import { SavedLibrary } from './components/SavedLibrary';
import { SettingsSheet } from './components/SettingsSheet';
import { DownloadJob, LibraryFile, SystemHealth, AdvancedSettings } from './types';
import { Compass, Activity, Bookmark, Sliders } from 'lucide-react';

const TABS: Array<{ id: 'inspect' | 'queue' | 'saved' | 'settings'; label: string; Icon: typeof Compass }> = [
  { id: 'inspect', label: 'Explore', Icon: Compass },
  { id: 'queue', label: 'Queue', Icon: Activity },
  { id: 'saved', label: 'Saved', Icon: Bookmark },
  { id: 'settings', label: 'Config', Icon: Sliders },
];

const MemoInspectPost = React.memo(InspectPost);
const MemoQueueFeed = React.memo(QueueFeed);
const MemoSavedLibrary = React.memo(SavedLibrary);
const MemoSettingsSheet = React.memo(SettingsSheet);

export default function App() {
  const [activeTab, setActiveTab] = useState<'inspect' | 'queue' | 'saved' | 'settings'>('inspect');
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('clipstream_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    try {
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      localStorage.setItem('clipstream_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Fetch health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch downloads queue
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/downloads');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch library files
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchJobs();
    fetchFiles();

    // Poll jobs queue regularly for live progress
    const interval = setInterval(() => {
      fetchJobs();
    }, 1500);

    return () => clearInterval(interval);
  }, [fetchHealth, fetchJobs, fetchFiles]);

  // Allow deep components (empty-state CTAs) to switch tabs without prop drilling
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail as 'inspect' | 'queue' | 'saved' | 'settings';
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('app:navigate', onNavigate);
    return () => window.removeEventListener('app:navigate', onNavigate);
  }, []);

  // When a job completes, refresh library files
  useEffect(() => {
    const hasCompleted = jobs.some((j) => j.status === 'completed');
    if (hasCompleted) {
      fetchFiles();
    }
  }, [jobs, fetchFiles]);

  const handleStartDownload = useCallback(async (url: string, options: any) => {
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, ...options }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start download.');
      }

      showToast('Download added to queue!');
      await fetchJobs();
      setActiveTab('queue');
    } catch (err: any) {
      showToast(err.message || 'Error queuing download');
      throw err;
    }
  }, [fetchJobs]);

  const handleCancelJob = useCallback(async (jobId: string) => {
    try {
      await fetch(`/api/downloads/${jobId}`, { method: 'DELETE' });
      showToast('Download cancelled');
      await fetchJobs();
    } catch {
      showToast('Failed to cancel');
    }
  }, [fetchJobs]);

  const handleScheduleJob = useCallback(async (jobId: string, scheduledFor: string | null) => {
    try {
      const res = await fetch(`/api/downloads/${jobId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_for: scheduledFor }),
      });
      if (res.ok) {
        showToast(scheduledFor ? 'Download scheduled successfully' : 'Download queued immediately');
        await fetchJobs();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to update schedule');
      }
    } catch {
      showToast('Error scheduling download');
    }
  }, [fetchJobs]);

  const handleStartNow = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/downloads/${jobId}/start-now`, { method: 'POST' });
      if (res.ok) {
        showToast('Download started immediately');
        await fetchJobs();
      } else {
        showToast('Failed to start download');
      }
    } catch {
      showToast('Error starting download');
    }
  }, [fetchJobs]);

  const handleCreateScheduledDownload = useCallback(async (url: string, scheduledFor: string, options?: any) => {
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, scheduled_for: scheduledFor, ...options }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to schedule download.');
      }
      showToast('Download scheduled with background worker!');
      await fetchJobs();
    } catch (err: any) {
      showToast(err.message || 'Error scheduling download');
      throw err;
    }
  }, [fetchJobs]);

  const handleDeleteFile = useCallback(async (filename: string) => {
    try {
      await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      showToast('File removed from library');
      await fetchFiles();
    } catch {
      showToast('Failed to delete file');
    }
  }, [fetchFiles]);

  const handleBulkDeleteFiles = useCallback(async (filenames: string[]) => {
    try {
      const res = await fetch('/api/files/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`${data.count || filenames.length} files removed from library`);
        await fetchFiles();
      } else {
        showToast('Failed to delete files in bulk');
      }
    } catch {
      showToast('Error deleting files');
    }
  }, [fetchFiles]);

  const activeQueueCount = jobs.filter(
    (j) => j.status === 'queued' || j.status === 'downloading'
  ).length;

  // Stable tab handlers so memoized children don't re-render every poll tick
  const goInspectTab = useCallback(() => setActiveTab('inspect'), []);
  const goSavedTab = useCallback(() => setActiveTab('saved'), []);
  const goSettingsTab = useCallback(() => setActiveTab('settings'), []);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'light bg-neutral-50 text-neutral-900' : 'bg-black text-white'} flex flex-col font-sans selection:bg-rose-500/30 transition-colors duration-200`}>
      {/* Minimal Top Header (brand + theme switch only) */}
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-24">
        {activeTab === 'inspect' && (
          <MemoInspectPost
            onStartDownload={handleStartDownload}
            advancedSettings={advancedSettings}
          />
        )}

        {activeTab === 'queue' && (
          <MemoQueueFeed
            jobs={jobs}
            onCancelJob={handleCancelJob}
            onScheduleJob={handleScheduleJob}
            onStartNow={handleStartNow}
            onCreateScheduled={handleCreateScheduledDownload}
            onNavigateToInspect={goInspectTab}
            onNavigateToSaved={goSavedTab}
            onNavigateToSettings={goSettingsTab}
          />
        )}

        {activeTab === 'saved' && (
          <MemoSavedLibrary
            files={files}
            onDeleteFile={handleDeleteFile}
            onBulkDeleteFiles={handleBulkDeleteFiles}
            onRefresh={fetchFiles}
            onNavigateToInspect={goInspectTab}
          />
        )}

        {activeTab === 'settings' && (
          <MemoSettingsSheet
            settings={advancedSettings}
            setSettings={setAdvancedSettings}
            health={health}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/85 dark:bg-black/85 backdrop-blur-xl border-t border-neutral-800/70">
        <div className="grid grid-cols-4 items-center h-14 max-w-md mx-auto">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const badge = id === 'queue' ? activeQueueCount : id === 'saved' ? files.length : 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight">{label}</span>
                {badge > 0 && (
                  <span
                    className={`absolute top-1 right-[calc(50%-16px)] rounded-full min-w-[16px] h-4 px-1 text-[9px] font-bold leading-4 text-center ${
                      id === 'queue'
                        ? 'instagram-gradient text-white animate-pulse'
                        : 'bg-neutral-700 text-neutral-200'
                    }`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-18 md:bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-neutral-900/95 border border-neutral-800 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full instagram-gradient shrink-0"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
