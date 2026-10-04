import React, { useState } from 'react';
import {
  Bookmark,
  Search,
  Download,
  Trash2,
  FileVideo,
  FileAudio,
  FileText,
  Image as ImageIcon,
  FileCode,
  File,
  LayoutGrid,
  List,
  Compass,
  Play,
  RefreshCw,
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  Check,
  FolderOpen,
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
  onBulkDeleteFiles,
  onRefresh,
  onNavigateToInspect,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'video' | 'audio' | 'subtitle' | 'thumbnail' | 'metadata'
  >('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeMediaFile, setActiveMediaFile] = useState<LibraryFile | null>(null);

  // Bulk action selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  const getFileCategory = (
    name: string
  ): 'video' | 'audio' | 'subtitle' | 'thumbnail' | 'metadata' | 'other' => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video';
    if (['mp3', 'm4a', 'flac', 'wav', 'opus', 'aac'].includes(ext || '')) return 'audio';
    if (['srt', 'vtt', 'ass', 'lrc'].includes(ext || '')) return 'subtitle';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return 'thumbnail';
    if (['json', 'txt', 'nfo'].includes(ext || '')) return 'metadata';
    return 'other';
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'video':
        return <FileVideo className="w-5 h-5 text-indigo-400" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-rose-400" />;
      case 'subtitle':
        return <FileText className="w-5 h-5 text-sky-400" />;
      case 'thumbnail':
        return <ImageIcon className="w-5 h-5 text-amber-400" />;
      case 'metadata':
        return <FileCode className="w-5 h-5 text-emerald-400" />;
      default:
        return <File className="w-5 h-5 text-neutral-400" />;
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const cat = getFileCategory(f.name);
    const matchesCategory = filterType === 'all' || cat === filterType;
    return matchesSearch && matchesCategory;
  });

  const totalSize = files.reduce((acc, curr) => acc + curr.size, 0);

  // Selected files metrics
  const selectedFileList = files.filter((f) => selectedFiles.has(f.name));
  const selectedTotalSize = selectedFileList.reduce((acc, curr) => acc + curr.size, 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const toggleSelectFile = (name: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      if (next.size > 0 && !isSelectionMode) {
        setIsSelectionMode(true);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.name)));
      setIsSelectionMode(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
    setIsSelectionMode(false);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const names = Array.from(selectedFiles);
      if (onBulkDeleteFiles) {
        await onBulkDeleteFiles(names);
      } else {
        // Fallback sequential delete
        for (const name of names) {
          await onDeleteFile(name);
        }
      }
      setSelectedFiles(new Set());
      setIsSelectionMode(false);
      setShowBulkDeleteModal(false);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDownload = () => {
    // Sequentially trigger browser download for selected files
    selectedFileList.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `/api/files/${encodeURIComponent(file.name)}?download=1`;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250);
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-semibold text-white">Saved Media Vault</h2>
          <p className="text-xs text-neutral-400">
            {files.length} saved assets · {formatBytes(totalSize)} total
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Select Mode Toggle */}
          {files.length > 0 && (
            <button
              onClick={() => {
                if (isSelectionMode) {
                  handleClearSelection();
                } else {
                  setIsSelectionMode(true);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                isSelectionMode || selectedFiles.size > 0
                  ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
              }`}
              title="Toggle multi-select mode"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectionMode ? 'Done' : 'Select'}</span>
              {selectedFiles.size > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                  {selectedFiles.size}
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer ${
              refreshing ? 'animate-spin' : ''
            }`}
            title="Refresh Library"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="flex items-center p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
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

      {/* Filter Tabs & Search Bar */}
      {files.length > 0 && (
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, extension, or category..."
              className="w-full h-10 pl-9 pr-4 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'video', label: 'Videos' },
              { id: 'audio', label: 'Audio' },
              { id: 'subtitle', label: 'Subtitles' },
              { id: 'thumbnail', label: 'Cover Art' },
              { id: 'metadata', label: 'Metadata' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-white text-black font-semibold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating / Sticky Bulk Action Menu */}
      {selectedFiles.size > 0 && (
        <div className="sticky top-16 z-30 p-3 bg-neutral-900/95 border border-rose-500/50 rounded-2xl shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white font-medium cursor-pointer"
            >
              {selectedFiles.size === filteredFiles.length ? (
                <CheckSquare className="w-4 h-4 text-rose-400" />
              ) : (
                <Square className="w-4 h-4 text-neutral-500" />
              )}
              <span>
                {selectedFiles.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            <span className="text-neutral-600">|</span>

            <div className="text-xs">
              <span className="font-bold text-white">{selectedFiles.size}</span>
              <span className="text-neutral-400"> of {filteredFiles.length} selected</span>
              <span className="text-neutral-500 font-mono text-[11px] ml-1">
                ({formatBytes(selectedTotalSize)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Download Selected */}
            <button
              onClick={handleBulkDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 transition-colors cursor-pointer"
              title="Download all selected files"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download ({selectedFiles.size})</span>
            </button>

            {/* Delete Selected */}
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              title="Delete all selected files"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedFiles.size})</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={handleClearSelection}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Close selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-5 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Delete {selectedFiles.size} Selected {selectedFiles.size === 1 ? 'File' : 'Files'}?
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  This will free up <strong className="text-white">{formatBytes(selectedTotalSize)}</strong> of disk space.
                </p>
              </div>
            </div>

            {/* Preview of items to delete */}
            <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl max-h-36 overflow-y-auto space-y-1.5 text-xs">
              {selectedFileList.slice(0, 5).map((f) => (
                <div key={f.name} className="flex items-center justify-between text-neutral-300">
                  <span className="truncate max-w-[240px] font-mono text-[11px]">{f.name}</span>
                  <span className="text-neutral-500 text-[10px] shrink-0">{formatBytes(f.size)}</span>
                </div>
              ))}
              {selectedFileList.length > 5 && (
                <p className="text-[11px] text-neutral-500 italic pt-1">
                  ... and {selectedFileList.length - 5} more files
                </p>
              )}
            </div>

            <p className="text-[11px] text-neutral-400">
              Are you sure? Once deleted, these downloaded assets cannot be recovered and must be downloaded again.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting files...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete ({selectedFiles.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Media Player Modal / Preview Banner */}
      {activeMediaFile && (
        <div className="p-4 bg-neutral-950 border border-neutral-700 rounded-2xl space-y-3 shadow-2xl relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
              <span className="text-xs font-semibold text-white truncate max-w-sm">
                Now Playing: {activeMediaFile.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/files/${encodeURIComponent(activeMediaFile.name)}?download=1`}
                download={activeMediaFile.name}
                className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </a>
              <button
                onClick={() => setActiveMediaFile(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Audio or Video element */}
          {getFileCategory(activeMediaFile.name) === 'video' ? (
            <video
              src={`/api/files/${encodeURIComponent(activeMediaFile.name)}`}
              controls
              autoPlay
              playsInline
              className="w-full max-h-72 rounded-xl bg-black object-contain border border-neutral-800"
            />
          ) : (
            <audio
              src={`/api/files/${encodeURIComponent(activeMediaFile.name)}`}
              controls
              autoPlay
              className="w-full h-10 rounded-lg"
            />
          )}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-neutral-950 border border-neutral-900 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto text-neutral-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Media Vault is Empty</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Any videos, audio tracks, subtitles, or thumbnails you download will be stored here for offline viewing and playback.
            </p>
          </div>
          <button
            onClick={() => (onNavigateToInspect ? onNavigateToInspect() : window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'inspect' })))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white instagram-gradient shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover & Download</span>
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500">
          No files matching your search or category filter.
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const category = getFileCategory(file.name);
            const isPlayable = category === 'video' || category === 'audio';
            const isSelected = selectedFiles.has(file.name);

            return (
              <div
                key={file.name}
                onClick={(e) => {
                  // If in selection mode or clicking on checkbox area
                  if (isSelectionMode) {
                    toggleSelectFile(file.name);
                  }
                }}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-all border ${
                  isSelected
                    ? 'bg-rose-950/20 border-rose-500/60 shadow-sm'
                    : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700/80'
                } ${isSelectionMode ? 'cursor-pointer select-none' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Selection Checkbox */}
                  {(isSelectionMode || selectedFiles.size > 0) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectFile(file.name);
                      }}
                      className="p-1 text-neutral-400 hover:text-white shrink-0 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-600 hover:text-neutral-400" />
                      )}
                    </button>
                  )}

                  <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                    {getFileIcon(category)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md"
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                      <span className="uppercase font-mono text-[10px] text-neutral-300">
                        {category}
                      </span>
                      <span>·</span>
                      <span>{formatBytes(file.size)}</span>
                      <span>·</span>
                      <span>{formatDate(file.modified)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isPlayable && (
                    <button
                      onClick={() => setActiveMediaFile(file)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-rose-400 hover:text-rose-300 border border-neutral-800 transition-colors cursor-pointer"
                      title="Play media"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}

                  <a
                    href={`/api/files/${encodeURIComponent(file.name)}?download=1`}
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
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-1.5 py-1 text-neutral-400 hover:text-white text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(file.name)}
                      className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 gap-3">
          {filteredFiles.map((file) => {
            const category = getFileCategory(file.name);
            const isPlayable = category === 'video' || category === 'audio';
            const isSelected = selectedFiles.has(file.name);

            return (
              <div
                key={file.name}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelectFile(file.name);
                  }
                }}
                className={`border rounded-2xl p-3 flex flex-col justify-between space-y-3 transition-all relative ${
                  isSelected
                    ? 'bg-rose-950/20 border-rose-500/70 shadow-sm'
                    : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                } ${isSelectionMode ? 'cursor-pointer select-none' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {(isSelectionMode || selectedFiles.size > 0) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectFile(file.name);
                        }}
                        className="p-0.5 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-rose-500" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-600 hover:text-neutral-400" />
                        )}
                      </button>
                    )}
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                      {getFileIcon(category)}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    {formatBytes(file.size)}
                  </div>
                </div>

                <div>
                  <p
                    className="text-xs font-semibold text-white line-clamp-2 leading-snug"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase font-mono">
                    {category} · {formatDate(file.modified)}
                  </p>
                </div>

                <div
                  className="pt-2 border-t border-neutral-900 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isPlayable ? (
                    <button
                      onClick={() => setActiveMediaFile(file)}
                      className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-neutral-600">Asset</span>
                  )}

                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/files/${encodeURIComponent(file.name)}?download=1`}
                      download={file.name}
                      className="text-neutral-400 hover:text-white p-1"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => onDeleteFile(file.name)}
                      className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
