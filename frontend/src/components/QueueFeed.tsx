import React, { useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Clock,
  ArrowDownCircle,
  FileCheck,
} from 'lucide-react';
import { DownloadJob } from '../types';

interface QueueFeedProps {
  jobs: DownloadJob[];
  onCancelJob: (id: string) => Promise<void>;
  onScheduleJob?: (id: string, scheduledFor: string | null) => Promise<void>;
  onStartNow?: (id: string) => Promise<void>;
  onCreateScheduled?: (url: string, scheduledFor: string, options?: any) => Promise<void>;
  onNavigateToInspect?: () => void;
  onNavigateToSaved?: () => void;
  onNavigateToSettings?: () => void;
}

export const QueueFeed: React.FC<QueueFeedProps> = ({
  jobs,
  onCancelJob,
  onStartNow,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSec: number | null) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '';
    const mb = bytesPerSec / (1024 * 1024);
    return `${mb.toFixed(1)} MB/s`;
  };

  const formatETA = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'active') return job.status === 'downloading' || job.status === 'queued';
    if (filter === 'completed') return job.status === 'completed';
    return true;
  });

  const activeCount = jobs.filter(
    (j) => j.status === 'downloading' || j.status === 'queued'
  ).length;

  // If no jobs at all exist, keep the section minimal and un-cluttered
  if (jobs.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto py-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Activity
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">Idle</span>
        </div>
        <div className="py-8 text-center text-zinc-500 text-xs">
          Queue is clear · media downloads will stream here in real time.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Sleek Minimal Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Activity
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {activeCount} active
            </span>
          )}
        </div>

        {/* Minimalist Filter Pills */}
        <div className="flex items-center gap-1">
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize cursor-pointer ${
                filter === tab
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Streamlined Job Cards */}
      <div className="space-y-2">
        {filteredJobs.length === 0 ? (
          <div className="py-6 text-center text-zinc-500 text-xs">
            No {filter} items found.
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isDownloading = job.status === 'downloading';
            const isQueued = job.status === 'queued';
            const isCompleted = job.status === 'completed';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';

            return (
              <div
                key={job.id}
                className="group relative bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-3.5 transition-all shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Status Indicator Icon */}
                  <div className="mt-0.5 shrink-0">
                    {isDownloading && (
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    )}
                    {isQueued && <Clock className="w-4 h-4 text-zinc-500" />}
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {isFailed && (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    {isCancelled && <X className="w-4 h-4 text-zinc-600" />}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3
                        className="text-xs font-medium text-zinc-200 truncate"
                        title={job.title || job.url}
                      >
                        {job.title || job.url}
                      </h3>
                      {isDownloading && (
                        <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                          {Math.round(job.progress)}%
                        </span>
                      )}
                    </div>

                    {/* Progress Bar (Visible when downloading or queued) */}
                    {(isDownloading || isQueued) && (
                      <div className="w-full bg-zinc-800/80 rounded-full h-1 mt-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                          style={{ width: `${Math.max(job.progress, isDownloading ? 5 : 2)}%` }}
                        />
                      </div>
                    )}

                    {/* Compact Metrics Row */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500">
                      {isDownloading && (
                        <>
                          {job.speed && <span>{formatSpeed(job.speed)}</span>}
                          {job.eta && (
                            <>
                              <span>·</span>
                              <span>ETA {formatETA(job.eta)}</span>
                            </>
                          )}
                          {job.size && (
                            <>
                              <span>·</span>
                              <span>{formatBytes(job.size)}</span>
                            </>
                          )}
                        </>
                      )}

                      {isQueued && <span>Waiting in line...</span>}

                      {isCompleted && (
                        <div className="flex items-center gap-1.5 text-emerald-400/90">
                          <FileCheck className="w-3 h-3" />
                          <span>Saved to library {job.size ? `(${formatBytes(job.size)})` : ''}</span>
                        </div>
                      )}

                      {isFailed && (
                        <span className="text-rose-400 truncate">
                          {job.error || 'Download failed'}
                        </span>
                      )}

                      {isCancelled && <span>Cancelled</span>}
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="shrink-0 flex items-center gap-1">
                    {isQueued && onStartNow && (
                      <button
                        type="button"
                        onClick={() => onStartNow(job.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                        title="Start immediately"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(isDownloading || isQueued) && (
                      <button
                        type="button"
                        onClick={() => onCancelJob(job.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                        title="Cancel download"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(isCompleted || isFailed || isCancelled) && (
                      <button
                        type="button"
                        onClick={() => onCancelJob(job.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all cursor-pointer"
                        title="Clear from activity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
