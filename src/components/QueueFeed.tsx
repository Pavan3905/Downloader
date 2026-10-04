import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  Compass,
  Calendar,
  Play,
  Plus,
  Zap,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Video,
  Music,
} from 'lucide-react';
import { DownloadJob } from '../types';

interface QueueFeedProps {
  jobs: DownloadJob[];
  onCancelJob: (id: string) => Promise<void>;
  onScheduleJob?: (id: string, scheduledFor: string | null) => Promise<void>;
  onStartNow?: (id: string) => Promise<void>;
  onCreateScheduled?: (url: string, scheduledFor: string, options?: any) => Promise<void>;
  onNavigateToInspect?: () => void;
  onNavigateToSaved: () => void;
  onNavigateToSettings?: () => void;
}

export const QueueFeed: React.FC<QueueFeedProps> = ({
  jobs,
  onCancelJob,
  onScheduleJob,
  onStartNow,
  onCreateScheduled,
  onNavigateToInspect,
  onNavigateToSaved,
  onNavigateToSettings,
}) => {
  // Bottom nav owns tab switching; these CTAs fall back to a global navigate event when props are absent.
  const goInspect = () => (onNavigateToInspect ? onNavigateToInspect() : window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'inspect' })));
  const goSettings = () => (onNavigateToSettings ? onNavigateToSettings() : window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'settings' })));
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'active' | 'completed'>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // New scheduled download form state
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'video' | 'audio'>('video');
  const [selectedPreset, setSelectedPreset] = useState<string>('15m');
  const [customDateTime, setCustomDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Tick clock to re-render countdowns smoothly every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes <= 0) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSec: number | null) => {
    if (!bytesPerSec || bytesPerSec <= 0) return null;
    const mb = bytesPerSec / (1024 * 1024);
    return `${mb.toFixed(1)} MB/s`;
  };

  // Helper to calculate target ISO timestamp based on preset or custom input
  const calculateTargetTime = (preset: string, customVal: string): Date => {
    const now = new Date();
    if (preset === '15m') return new Date(now.getTime() + 15 * 60 * 1000);
    if (preset === '30m') return new Date(now.getTime() + 30 * 60 * 1000);
    if (preset === '1h') return new Date(now.getTime() + 60 * 60 * 1000);
    if (preset === '2h') return new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (preset === 'tonight') {
      const target = new Date();
      target.setHours(23, 59, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    }
    if (preset === 'morning') {
      const target = new Date();
      target.setHours(6, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    }
    if (preset === 'custom' && customVal) {
      const d = new Date(customVal);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(now.getTime() + 15 * 60 * 1000);
  };

  // Human-readable countdown formatter
  const formatCountdown = (targetIso: string) => {
    const target = new Date(targetIso).getTime();
    const diff = target - Date.now();
    if (diff <= 0) return 'Starting now via background worker...';

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `Starts in ${minutes}m ${seconds}s`;
    }
    return `Starts in ${seconds}s`;
  };

  const handleCreateScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleUrl.trim()) {
      setFormError('Please enter a valid media URL.');
      return;
    }
    if (!/^https?:\/\//i.test(scheduleUrl.trim())) {
      setFormError('URL must start with http:// or https://');
      return;
    }

    const targetDate = calculateTargetTime(selectedPreset, customDateTime);
    if (targetDate.getTime() <= Date.now() + 5000) {
      setFormError('Scheduled time must be in the future.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (onCreateScheduled) {
        await onCreateScheduled(scheduleUrl.trim(), targetDate.toISOString(), {
          audio_only: scheduleMode === 'audio',
          audio_format: 'mp3',
          quality: '192',
          format_id: 'auto',
        });
      }
      setScheduleUrl('');
      setShowScheduleModal(false);
      setSelectedPreset('15m');
      setCustomDateTime('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to schedule download.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescheduleSubmit = async (jobId: string) => {
    const targetDate = calculateTargetTime(selectedPreset, customDateTime);
    if (onScheduleJob) {
      await onScheduleJob(jobId, targetDate.toISOString());
    }
    setEditingJobId(null);
  };

  // Counts
  const scheduledCount = jobs.filter((j) => j.status === 'scheduled').length;
  const activeCount = jobs.filter(
    (j) => j.status === 'downloading' || j.status === 'queued'
  ).length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'scheduled') return job.status === 'scheduled';
    if (filter === 'active') return job.status === 'downloading' || job.status === 'queued';
    if (filter === 'completed') return job.status === 'completed' || job.status === 'failed';
    return true;
  });

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Download Queue & Scheduler</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Zap className="w-2.5 h-2.5 text-violet-400" />
              <span>Worker Active (3s)</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Background worker triggers delayed starts automatically
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowScheduleModal(true);
            setFormError(null);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>+ Schedule Download</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800/80 rounded-xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            filter === 'all'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          All ({jobs.length})
        </button>

        <button
          onClick={() => setFilter('scheduled')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            filter === 'scheduled'
              ? 'bg-violet-950 text-violet-200 border border-violet-800/60 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Clock className="w-3 h-3 text-violet-400" />
          <span>Scheduled ({scheduledCount})</span>
        </button>

        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            filter === 'active'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Active ({activeCount})
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            filter === 'completed'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Finished ({completedCount})
        </button>
      </div>

      {/* Schedule Download Modal */}
      {showScheduleModal && (
        <div className="p-4 bg-neutral-950 border border-violet-500/40 rounded-2xl shadow-xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-800/80 flex items-center justify-center text-violet-400">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-white">Schedule Download for Later</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="text-neutral-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateScheduleSubmit} className="space-y-3">
            {/* URL Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-300">Media URL</label>
              <div className="relative">
                <input
                  type="text"
                  value={scheduleUrl}
                  onChange={(e) => setScheduleUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or any video link"
                  className="w-full h-9 pl-8 pr-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                />
                <LinkIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-3" />
              </div>
            </div>

            {/* Mode selection */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400">Format:</span>
              <div className="flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setScheduleMode('video')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                    scheduleMode === 'video'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3 h-3" />
                  <span>Video MP4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode('audio')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                    scheduleMode === 'audio'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Music className="w-3 h-3" />
                  <span>Audio MP3</span>
                </button>
              </div>
            </div>

            {/* Preset Times */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-300">Start Time Delay</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: '15m', label: '15 Mins' },
                  { id: '30m', label: '30 Mins' },
                  { id: '1h', label: '1 Hour' },
                  { id: '2h', label: '2 Hours' },
                  { id: 'tonight', label: 'Midnight' },
                  { id: 'morning', label: '6:00 AM' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setCustomDateTime('');
                    }}
                    className={`py-1.5 px-2 text-center rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                      selectedPreset === preset.id
                        ? 'bg-violet-950/80 border-violet-600 text-violet-200 shadow-sm'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date & Time Picker */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Or Pick Custom Date & Time:</span>
                  {selectedPreset === 'custom' && (
                    <span className="text-violet-400 font-medium">Selected</span>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => {
                    setCustomDateTime(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="w-full h-8 px-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Target preview & background worker notice */}
            <div className="p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800/80 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span>Scheduled Execution:</span>
                <span className="font-semibold text-violet-300 font-mono">
                  {calculateTargetTime(selectedPreset, customDateTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-violet-400" />
                <span>Background worker process checks every 3 seconds and launches the job automatically.</span>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-rose-400">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Confirm Schedule</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {filteredJobs.length === 0 ? (
        <div className="py-14 text-center space-y-3 bg-neutral-950 border border-neutral-900 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto text-neutral-400">
            {filter === 'scheduled' ? (
              <Clock className="w-6 h-6 text-violet-400" />
            ) : (
              <Activity className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              {filter === 'scheduled'
                ? 'No scheduled downloads'
                : 'No downloads found for this filter'}
            </p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              {filter === 'scheduled'
                ? 'Click "+ Schedule Download" above to set a delayed download with the background worker.'
                : 'Any video or audio you download or schedule will appear here with live progress.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setShowScheduleModal(true);
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-300 bg-violet-950/60 border border-violet-800 hover:bg-violet-900/60 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule a Link</span>
            </button>
            <button
              onClick={goInspect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white instagram-gradient shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Inspect Link</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredJobs.map((job) => {
            const isCompleted = job.status === 'completed';
            const isDownloading = job.status === 'downloading';
            const isScheduled = job.status === 'scheduled';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';
            const speedText = formatSpeed(job.speed);
            const isEditing = editingJobId === job.id;

            return (
              <div
                key={job.id}
                className={`p-3.5 bg-neutral-950 rounded-2xl space-y-2.5 shadow-sm transition-all border ${
                  isScheduled
                    ? 'border-violet-800/70 hover:border-violet-700/80 bg-gradient-to-b from-violet-950/20 to-neutral-950'
                    : 'border-neutral-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isScheduled
                          ? 'bg-violet-950/60 border-violet-700 text-violet-300 shadow-sm shadow-violet-950'
                          : isDownloading
                          ? 'bg-neutral-900 border-neutral-800 text-amber-400'
                          : isCompleted
                          ? 'bg-neutral-900 border-neutral-800 text-emerald-400'
                          : isFailed
                          ? 'bg-neutral-900 border-neutral-800 text-rose-500'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isScheduled ? (
                        <Clock className="w-5 h-5 animate-pulse" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isFailed ? (
                        <XCircle className="w-5 h-5" />
                      ) : isCancelled ? (
                        <X className="w-5 h-5 text-neutral-500" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-white truncate" title={job.title}>
                          {job.title}
                        </h3>
                        {isScheduled && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Scheduled
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-400 mt-0.5">
                        {isScheduled && job.scheduled_for && (
                          <>
                            <span className="text-violet-300 font-mono font-medium">
                              {formatCountdown(job.scheduled_for)}
                            </span>
                            <span className="text-neutral-500">
                              · Set for{' '}
                              {new Date(job.scheduled_for).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </>
                        )}
                        {isDownloading && (
                          <>
                            <span className="text-amber-400 font-medium">
                              {job.progress}%
                            </span>
                            {speedText && <span>· {speedText}</span>}
                            {job.eta && <span>· {job.eta}s left</span>}
                          </>
                        )}
                        {isCompleted && (
                          <>
                            <span className="text-emerald-400 font-medium">Completed</span>
                            {job.size && <span>· {formatBytes(job.size)}</span>}
                          </>
                        )}
                        {isFailed && (
                          <div className="space-y-1 w-full">
                            <span className="text-rose-400 block text-xs">
                              {job.error || 'Download failed'}
                            </span>
                            {job.error?.toLowerCase().includes('cookie') && (
                              <button
                                onClick={goSettings}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-semibold hover:bg-rose-500/30 transition-all cursor-pointer"
                              >
                                <span>Add YouTube Cookies in Settings</span>
                              </button>
                            )}
                          </div>
                        )}
                        {isCancelled && <span className="text-neutral-500">Cancelled</span>}
                        {job.status === 'queued' && (
                          <span className="text-neutral-400">Queued in line</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {/* Scheduled Item Controls */}
                    {isScheduled && (
                      <>
                        {onStartNow && (
                          <button
                            type="button"
                            onClick={() => onStartNow(job.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 text-xs font-medium transition-all cursor-pointer"
                            title="Start download immediately without waiting"
                          >
                            <Play className="w-3 h-3 fill-violet-200" />
                            <span>Start Now</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingJobId(isEditing ? null : job.id)}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
                          title="Reschedule delayed start"
                        >
                          <Clock className="w-4 h-4 text-violet-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onCancelJob(job.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-900 transition-colors"
                          title="Remove scheduled job"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Queued item can be scheduled */}
                    {job.status === 'queued' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingJobId(isEditing ? null : job.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs transition-colors border border-neutral-800"
                          title="Postpone / Schedule this download for later"
                        >
                          <Clock className="w-3 h-3 text-violet-400" />
                          <span>Schedule</span>
                        </button>
                        <button
                          onClick={() => onCancelJob(job.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-900 transition-colors"
                          title="Cancel queued download"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {isDownloading && (
                      <button
                        onClick={() => onCancelJob(job.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-900 transition-colors"
                        title="Cancel active download"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        onClick={onNavigateToSaved}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 transition-colors"
                      >
                        Saved
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Reschedule Form */}
                {isEditing && (
                  <div className="pt-2 border-t border-neutral-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="font-semibold text-violet-300">Reschedule Start Time:</span>
                      <button
                        type="button"
                        onClick={() => setEditingJobId(null)}
                        className="text-neutral-500 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: '15m', label: '+15m' },
                        { id: '30m', label: '+30m' },
                        { id: '1h', label: '+1 Hour' },
                        { id: 'tonight', label: 'Tonight' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(p.id);
                            setCustomDateTime('');
                          }}
                          className={`py-1 text-center rounded-lg border text-[11px] font-medium transition-all ${
                            selectedPreset === p.id
                              ? 'bg-violet-950 border-violet-600 text-violet-200'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-neutral-400">
                        Will start at:{' '}
                        <strong className="text-white font-mono">
                          {calculateTargetTime(selectedPreset, customDateTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRescheduleSubmit(job.id)}
                        className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors"
                      >
                        Save New Time
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar for Active Download */}
                {isDownloading && (
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full instagram-gradient rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, job.progress)}%` }}
                    />
                  </div>
                )}

                {/* Scheduled Status Banner */}
                {isScheduled && !isEditing && (
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-violet-950/30 rounded-xl border border-violet-900/40 text-[11px]">
                    <div className="flex items-center gap-1.5 text-violet-300">
                      <Zap className="w-3 h-3 text-violet-400" />
                      <span>Background worker will start download automatically</span>
                    </div>
                    {onStartNow && (
                      <button
                        type="button"
                        onClick={() => onStartNow(job.id)}
                        className="text-violet-200 hover:text-white underline font-medium cursor-pointer"
                      >
                        Run now
                      </button>
                    )}
                  </div>
                )}

                {/* Generated Asset Badges for multi-asset downloads */}
                {isCompleted && job.generated_files && job.generated_files.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-neutral-900 text-[10px]">
                    <span className="text-neutral-500 font-medium">Assets Saved:</span>
                    {job.generated_files.map((asset, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono"
                        title={asset}
                      >
                        .{asset.split('.').pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
