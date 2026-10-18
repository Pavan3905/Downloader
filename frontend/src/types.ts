export interface MediaFormat {
  id: string;
  ext: string;
  resolution: string;
  height: number | null;
  fps: number | null;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  note: string;
  tbr: number | null;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration: number | null;
  thumbnail: string | null;
}

export interface Chapter {
  title: string;
  start_time: number;
  end_time: number;
}

export interface SubtitleTrack {
  lang: string;
  name: string;
  ext: string;
}

export interface MediaInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  uploader: string;
  channel_url: string | null;
  duration: number | null;
  view_count: number | null;
  upload_date: string | null;
  webpage_url: string;
  extractor: string;
  is_playlist: boolean;
  playlist_count: number | null;
  entries: PlaylistEntry[];
  formats: MediaFormat[];
  chapters?: Chapter[];
  subtitles?: SubtitleTrack[];
}

export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  status: 'queued' | 'scheduled' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed: number | null;
  eta: number | null;
  size: number | null;
  filename: string | null;
  generated_files?: string[];
  error: string | null;
  created_at: string;
  scheduled_for?: string | null;
  options?: any;
}

export interface LibraryFile {
  name: string;
  size: number;
  modified: string;
  url: string;
  type?: 'video' | 'audio' | 'subtitle' | 'thumbnail' | 'metadata' | 'other';
}

export interface SystemHealth {
  ok: boolean;
  app_version: string;
  version: string;
  ffmpeg: boolean;
  ffprobe: boolean;
  js_runtime: string;
  has_cookies?: boolean;
  active: number;
}

export interface AdvancedSettings {
  subtitle_mode: 'off' | 'separate' | 'embed' | 'both';
  subtitle_languages: string;
  subtitle_format: 'best' | 'srt' | 'vtt' | 'ass' | 'lrc' | 'ttml';
  thumbnail_mode: 'off' | 'separate' | 'embed' | 'both';
  metadata_mode: 'off' | 'separate' | 'embed' | 'both';
  embed_chapters: boolean;
  filename_template: string;
  merge_output_format: 'auto' | 'mp4' | 'mkv' | 'webm' | 'mov';
  custom_format_selector: string;
  playlist_items: string;
  limit_rate: string;
  retries: number;
  fragment_retries: number;
  concurrent_fragments: number;
  socket_timeout: number;
  cookies_from_browser: string;
  proxy: string;
  cookies?: string;
}
