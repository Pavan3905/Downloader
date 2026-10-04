import React from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  Compass,
  ArrowDownToLine,
  Trash2,
  FileVideo,
} from 'lucide-react';
import { DownloadJob } from '../types';

interface QueueFeedProps {
  jobs: DownloadJob[];
  onCancelJob: (id: string) => Promise<void>;
  onNavigateToInspect: () => void;
  onNavigateToSaved: () => void;
}

export const QueueFeed: React.FC<QueueFeedProps> = ({
  jobs,
  onCancelJob,
  onNavigateToInspect,
  onNavigateToSaved,
}) => {
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

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-semibold text-white">Download Activity</h2>
          <p className="text-xs text-neutral-400">
            {jobs.length === 0
              ? 'No downloads in progress'
              : `${jobs.length} total ${jobs.length === 1 ? 'task' : 'tasks'}`}
          </p>
        </div>
      </div>

      {/* List */}
      {jobs.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-neutral-950 border border-neutral-900 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto text-neutral-400">
            <Activity className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Your queue is clear</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Any video, song, or playlist you choose to download will appear here with live progress.
            </p>
          </div>
          <button
            onClick={onNavigateToInspect}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white instagram-gradient shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Inspect a Link</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {jobs.map((job) => {
            const isCompleted = job.status === 'completed';
            const isDownloading = job.status === 'downloading';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';
            const speedText = formatSpeed(job.speed);

            return (
              <div
                key={job.id}
                className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-2xl space-y-2.5 shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-white">
                      {isDownloading ? (
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isFailed ? (
                        <XCircle className="w-5 h-5 text-rose-500" />
                      ) : isCancelled ? (
                        <X className="w-5 h-5 text-neutral-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-semibold text-white truncate" title={job.title}>
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
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
                          <span className="text-rose-400 truncate max-w-xs">
                            {job.error || 'Download failed'}
                          </span>
                        )}
                        {isCancelled && <span className="text-neutral-500">Cancelled</span>}
                        {job.status === 'queued' && (
                          <span className="text-neutral-400">Queued in line</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {(isDownloading || job.status === 'queued') && (
                      <button
                        onClick={() => onCancelJob(job.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-900 transition-colors"
                        title="Cancel download"
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

                {/* Progress Bar */}
                {isDownloading && (
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full instagram-gradient rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, job.progress)}%` }}
                    />
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
