import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InspectPost } from './components/InspectPost';
import { QueueFeed } from './components/QueueFeed';
import { SavedLibrary } from './components/SavedLibrary';
import { SettingsSheet } from './components/SettingsSheet';
import { DownloadJob, LibraryFile, AdvancedSettings } from './types';
import { Sliders, X } from 'lucide-react';

const MemoInspectPost = React.memo(InspectPost);
const MemoQueueFeed = React.memo(QueueFeed);
const MemoSavedLibrary = React.memo(SavedLibrary);
const MemoSettingsSheet = React.memo(SettingsSheet);

export default function App() {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const autoSaveJobIdsRef = React.useRef<Set<string>>(new Set());
  const triggeredDownloadsRef = React.useRef<Set<string>>(new Set());

  // Function to trigger direct device download
  const triggerDeviceDownload = useCallback((filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = `/api/files/${encodeURIComponent(filename)}?download=1`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 500);
    } catch {}
  }, []);

  // Poll jobs queue: 500ms when active downloads exist for real-time progress & instant device download, 4s when idle
  useEffect(() => {
    fetchJobs();
    fetchFiles();

    const hasActiveJobs = jobs.some((j) => j.status === 'downloading' || j.status === 'queued');
    const intervalTime = hasActiveJobs ? 500 : 4000;

    const interval = setInterval(() => {
      fetchJobs();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [fetchJobs, fetchFiles, jobs]);

  // When jobs update, auto-download completed files to the user's device immediately
  useEffect(() => {
    for (const job of jobs) {
      if (
        job.status === 'completed' &&
        job.filename &&
        autoSaveJobIdsRef.current.has(job.id) &&
        !triggeredDownloadsRef.current.has(job.id)
      ) {
        triggeredDownloadsRef.current.add(job.id);
        autoSaveJobIdsRef.current.delete(job.id);
        triggerDeviceDownload(job.filename);
        showToast(`Downloading "${job.filename}" to your device!`);
      }
    }
  }, [jobs, triggerDeviceDownload]);

  // Toast notification event listener
  useEffect(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      if (msg) showToast(msg);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  // Global Keyboard Paste (Ctrl+V / Cmd+V Anywhere on the page)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is purposefully typing inside settings inputs or another text area
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      const isMainUrlInput = active && active.getAttribute('type') === 'url';

      const text = e.clipboardData?.getData('text') || '';
      const trimmed = text.trim();

      if (trimmed && /^https?:\/\//i.test(trimmed)) {
        if (!isInput || isMainUrlInput) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('app:global-paste', {
              detail: { url: trimmed, autoDownload: false },
            })
          );
          showToast('Captured link from clipboard! Inspecting...');
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Support 1-Click Browser Bookmarklet & PWA Web Share Target (?url=...&auto=1)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const sharedUrl = searchParams.get('url') || searchParams.get('text');
      const auto = searchParams.get('auto') === '1' || searchParams.get('auto') === 'true';

      if (sharedUrl && /^https?:\/\//i.test(sharedUrl.trim())) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('app:global-paste', {
              detail: { url: sharedUrl.trim(), autoDownload: auto },
            })
          );
          if (auto) {
            showToast('Bookmarklet triggered: Starting instant download!');
          }
        }, 150);
      }
    } catch {}
  }, []);

  // Deep event listeners for in-app anchor links
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (target === 'settings') {
        setIsSettingsOpen(true);
      } else if (target === 'queue') {
        document.getElementById('queue-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (target === 'saved') {
        document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (target === 'inspect') {
        document.getElementById('downloader-section')?.scrollIntoView({ behavior: 'smooth' });
      }
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

      const createdJob = await res.json().catch(() => null);
      if (createdJob && createdJob.id) {
        autoSaveJobIdsRef.current.add(createdJob.id);
      }

      showToast('Download started! File will save to your device immediately.');
      await fetchJobs();
      document.getElementById('queue-section')?.scrollIntoView({ behavior: 'smooth' });
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
        showToast('Failed to schedule download');
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
      document.getElementById('queue-section')?.scrollIntoView({ behavior: 'smooth' });
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

  const goInspectTab = useCallback(() => {
    document.getElementById('downloader-section')?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  const goSavedTab = useCallback(() => {
    document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  const goSettingsTab = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'light bg-zinc-50 text-zinc-900' : 'bg-black text-zinc-100'} flex flex-col font-sans selection:bg-zinc-700/30 transition-colors duration-200`}>
      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeJobsCount={activeQueueCount}
        filesCount={files.length}
      />

      {/* Main Unified Single-Screen Workspace */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* 1. Downloader & Media Inspector Section */}
        <section id="downloader-section" className="scroll-mt-20">
          <MemoInspectPost
            onStartDownload={handleStartDownload}
            advancedSettings={advancedSettings}
          />
        </section>

        {/* 2. Download Queue & Live Progress Section */}
        <section id="queue-section" className="scroll-mt-20">
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
        </section>

        {/* 3. Downloaded Files Library Section */}
        <section id="library-section" className="scroll-mt-20">
          <MemoSavedLibrary
            files={files}
            onDeleteFile={handleDeleteFile}
            onBulkDeleteFiles={handleBulkDeleteFiles}
            onRefresh={fetchFiles}
            onNavigateToInspect={goInspectTab}
          />
        </section>
      </main>

      {/* Settings Slide-Over Drawer Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsSettingsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 p-6 overflow-y-auto shadow-2xl z-10 flex flex-col space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Preferences</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer"
                aria-label="Close preferences"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <MemoSettingsSheet
                settings={advancedSettings}
                setSettings={setAdvancedSettings}
                theme={theme}
                setTheme={setTheme}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-full bg-zinc-900/95 border border-zinc-800 text-zinc-200 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
