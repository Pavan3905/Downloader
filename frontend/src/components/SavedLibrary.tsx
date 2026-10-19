import React, { useState } from 'react';
import {
  Search,
  Download,
  Trash2,
  FileVideo,
  FileAudio,
  FileText,
  File,
  Play,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import { LibraryFile } from '../types';

interface SavedLibraryProps {
  files: LibraryFile[];
  onDeleteFile: (filename: string) => Promise<void>;
  onBulkDeleteFiles?: (filenames: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  onNavigateToInspect?: () => void;
}

export const SavedLibrary: React.FC<SavedLibraryProps> = ({
  files,
  onDeleteFile,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getFileType = (name: string): 'video' | 'audio' | 'subtitle' | 'other' => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video';
    if (['mp3', 'm4a', 'flac', 'wav', 'opus', 'aac'].includes(ext || '')) return 'audio';
    if (['srt', 'vtt', 'ass', 'lrc'].includes(ext || '')) return 'subtitle';
    return 'other';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <FileVideo className="w-4 h-4 text-sky-400" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-emerald-400" />;
      case 'subtitle':
        return <FileText className="w-4 h-4 text-amber-400" />;
      default:
        return <File className="w-4 h-4 text-zinc-400" />;
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeletingFile(filename);
    try {
      await onDeleteFile(filename);
      if (previewFile?.name === filename) {
        setPreviewFile(null);
      }
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Sleek Minimal Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Library
          </span>
          {files.length > 0 && (
            <span className="text-[11px] font-mono text-zinc-500">
              {files.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          {files.length > 3 && (
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter files..."
                className="w-32 sm:w-44 h-7 pl-7 pr-2 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
            title="Refresh library"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Library File Rows */}
      {files.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-xs">
          Library is empty · downloaded media will be stored here.
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-xs">
          No files match "{search}"
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredFiles.map((file) => {
            const type = getFileType(file.name);
            const isPlayable = type === 'video' || type === 'audio';
            const isDeleting = deletingFile === file.name;

            return (
              <div
                key={file.name}
                className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800/40 hover:border-zinc-700/60 transition-all text-xs"
              >
                {/* File Glyph & Name */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 shrink-0">
                    {getFileIcon(type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-medium text-zinc-200 truncate cursor-pointer hover:text-white transition-colors"
                      title={file.name}
                      onClick={() => isPlayable && setPreviewFile(file)}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                      <span>{formatBytes(file.size)}</span>
                      {file.modified && (
                        <>
                          <span>·</span>
                          <span>{formatDate(file.modified)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Minimalist Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isPlayable && (
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title="Preview media"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <a
                    href={`/api/files/${encodeURIComponent(file.name)}`}
                    download={file.name}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Download to device"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(file.name)}
                    disabled={isDeleting}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sleek Minimalist Media Player Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setPreviewFile(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-10 space-y-3 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <p className="text-xs font-medium text-zinc-200 truncate pr-4">
                {previewFile.name}
              </p>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[200px]">
              {getFileType(previewFile.name) === 'video' ? (
                <video
                  src={`/api/files/${encodeURIComponent(previewFile.name)}`}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[60vh] object-contain"
                />
              ) : (
                <div className="w-full p-8 flex flex-col items-center gap-4">
                  <FileAudio className="w-12 h-12 text-emerald-400" />
                  <audio
                    src={`/api/files/${encodeURIComponent(previewFile.name)}`}
                    controls
                    autoPlay
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
              <span>{formatBytes(previewFile.size)}</span>
              <a
                href={`/api/files/${encodeURIComponent(previewFile.name)}`}
                download={previewFile.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Device</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
