import React, { useState } from 'react';
import {
  Bookmark,
  Search,
  Download,
  Trash2,
  FileVideo,
  FileAudio,
  File,
  LayoutGrid,
  List,
  Compass,
  Play,
  Check,
  RefreshCw,
} from 'lucide-react';
import { LibraryFile } from '../types';

interface SavedLibraryProps {
  files: LibraryFile[];
  onDeleteFile: (filename: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onNavigateToInspect: () => void;
}

export const SavedLibrary: React.FC<SavedLibraryProps> = ({
  files,
  onDeleteFile,
  onRefresh,
  onNavigateToInspect,
}) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['mp4', 'mkv', 'webm', 'mov'].includes(ext || '')) {
      return <FileVideo className="w-5 h-5 text-indigo-400" />;
    }
    if (['mp3', 'm4a', 'flac', 'wav', 'opus'].includes(ext || '')) {
      return <FileAudio className="w-5 h-5 text-rose-400" />;
    }
    return <File className="w-5 h-5 text-neutral-400" />;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((acc, curr) => acc + curr.size, 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-semibold text-white">Saved Media</h2>
          <p className="text-xs text-neutral-400">
            {files.length} saved · {formatBytes(totalSize)} total
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors ${
              refreshing ? 'animate-spin' : ''
            }`}
            title="Refresh Library"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      {files.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved files..."
            className="w-full h-10 pl-9 pr-4 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
          />
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-neutral-950 border border-neutral-900 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto text-neutral-400">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">No saved media yet</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Media downloaded from YouTube, Vimeo, or web links will appear here for playback and storage.
            </p>
          </div>
          <button
            onClick={onNavigateToInspect}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white instagram-gradient shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover & Download</span>
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-10 text-center text-xs text-neutral-500">
          No files match &quot;{search}&quot;
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <div
              key={file.name}
              className="p-3 bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700/80 rounded-2xl flex items-center justify-between gap-3 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                  {getFileIcon(file.name)}
                </div>
                <div className="min-w-0">
                  <h3
                    className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md"
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    <span>·</span>
                    <span>{formatDate(file.modified)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`/api/files/${encodeURIComponent(file.name)}`}
                  download={file.name}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
                  title="Download to device"
                >
                  <Download className="w-4 h-4" />
                </a>

                {confirmDelete === file.name ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDeleteFile(file.name);
                        setConfirmDelete(null);
                      }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-semibold transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-1.5 py-1 text-neutral-400 hover:text-white text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(file.name)}
                    className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 transition-colors"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid View (Instagram-style 2-column grid) */
        <div className="grid grid-cols-2 gap-3">
          {filteredFiles.map((file) => (
            <div
              key={file.name}
              className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3 flex flex-col justify-between space-y-3 group hover:border-neutral-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  {getFileIcon(file.name)}
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  {formatBytes(file.size)}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-white line-clamp-2 leading-snug" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-neutral-500 mt-1">
                  {formatDate(file.modified)}
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
                <a
                  href={`/api/files/${encodeURIComponent(file.name)}`}
                  download={file.name}
                  className="text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </a>
                <button
                  onClick={() => onDeleteFile(file.name)}
                  className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
