import React from 'react';

export interface PlatformItem {
  id: string;
  name: string;
  tag: string;
  dot: string;
  sampleUrl: string;
  icon: (className?: string) => React.ReactNode;
}

export const PLATFORMS_CATALOG: PlatformItem[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    tag: 'Reels · Post',
    dot: 'bg-pink-500',
    sampleUrl: 'https://www.instagram.com/reel/C8Xy_sample',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={cls} fill="none">
        <defs>
          <linearGradient id="ig-grad-marquee" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="25%" stopColor="#fd5949" />
            <stop offset="65%" stopColor="#d6249f" />
            <stop offset="100%" stopColor="#285AEB" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig-grad-marquee)" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad-marquee)" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad-marquee)" />
      </svg>
    ),
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    tag: 'Spotlight',
    dot: 'bg-yellow-400',
    sampleUrl: 'https://www.snapchat.com/spotlight/W7_EDnXwT1gAA',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-[#FFE600]`}>
        <path d="M12 2c-3.8 0-6 2.8-6 6.3 0 1.2.4 2.6 1 3.4-.2.5-.9 1.1-1.6 1.3-.3.1-.5.3-.5.6 0 .5.7.8 1.4.9.1.5-.1 1.2-.5 1.7-.2.2-.1.5.1.7.9.6 2.2.4 3.2.1.8.8 1.9 1 2.9 1s2.1-.2 2.9-1c1 .3 2.3.5 3.2-.1.2-.2.3-.5.1-.7-.4-.5-.6-1.2-.5-1.7.7-.1 1.4-.4 1.4-.9 0-.3-.2-.5-.5-.6-.7-.2-1.4-.8-1.6-1.3.6-.8 1-2.2 1-3.4 0-3.5-2.2-6.3-6-6.3z" />
      </svg>
    ),
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    tag: 'Direct MP4',
    dot: 'bg-zinc-300',
    sampleUrl: 'https://x.com/SpaceX/status/1649078635876352000',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-current`}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    tag: '4K Ultra HD',
    dot: 'bg-red-500',
    sampleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-[#FF0000]`}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    tag: 'HD No Watermark',
    dot: 'bg-cyan-400',
    sampleUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453678',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-current`}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.68 1.25-.11 2.37-.9 2.75-2.08.17-.47.24-.98.23-1.49l.01-16.34z" />
      </svg>
    ),
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    tag: '320kbps MP3',
    dot: 'bg-amber-500',
    sampleUrl: 'https://soundcloud.com/octobersveryown/champagnepapi-laugh-now-cry',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-[#FF5500]`}>
        <path d="M1.175 12.225c-.097 0-.175.08-.175.178v3.194c0 .099.078.178.175.178.097 0 .175-.08.175-.178v-3.194c0-.098-.078-.178-.175-.178zm1.05 0c-.097 0-.175.08-.175.178v3.194c0 .099.078.178.175.178.097 0 .175-.08.175-.178v-3.194c0-.098-.078-.178-.175-.178zm1.05-1.472c-.104 0-.188.086-.188.19v4.664c0 .105.084.19.188.19.103 0 .187-.085.187-.19v-4.664c0-.104-.084-.19-.187-.19zm1.063-.589c-.11 0-.2.091-.2.204v5.842c0 .113.09.204.2.204.11 0 .2-.091.2-.204v-5.842c0-.113-.09-.204-.2-.204zm1.075-.43c-.116 0-.213.099-.213.22v6.702c0 .121.097.22.213.22.116 0 .212-.099.212-.22v-6.702c0-.121-.096-.22-.212-.22zm1.088-.135c-.123 0-.225.104-.225.233v6.97c0 .128.102.232.225.232.123 0 .225-.104.225-.232v-6.97c0-.129-.102-.233-.225-.233zm1.1 0c-.13 0-.238.11-.238.245v6.945c0 .135.108.245.238.245.13 0 .237-.11.237-.245v-6.945c0-.135-.107-.245-.237-.245zm1.112-.662c-.137 0-.25.115-.25.257v8.264c0 .142.113.257.25.257.138 0 .25-.115.25-.257V9.394c0-.142-.112-.257-.25-.257zm1.125-.563c-.144 0-.263.121-.263.27v9.39c0 .148.119.27.263.27.144 0 .262-.122.262-.27V9.098c0-.149-.118-.27-.262-.27zm1.138-.073c-.15 0-.275.127-.275.282v9.535c0 .156.125.283.275.283.15 0 .275-.127.275-.283V9.317c0-.155-.125-.282-.275-.282zm1.15.54c-.157 0-.287.133-.287.295v8.995c0 .163.13.295.287.295.158 0 .288-.132.288-.295v-8.995c0-.162-.13-.295-.288-.295zm1.163-.993c-.164 0-.3.138-.3.308v10.37c0 .17.136.308.3.308.163 0 .3-.138.3-.308V8.62c0-.17-.137-.308-.3-.308zm2.462-1.928c-.287 0-.56.052-.812.147v12.46c.264.045.535.069.812.069 3.037 0 5.5-2.502 5.5-5.588 0-3.086-2.463-5.588-5.5-5.588z" />
      </svg>
    ),
  },
  {
    id: 'reddit',
    name: 'Reddit',
    tag: 'Audio + Video',
    dot: 'bg-orange-500',
    sampleUrl: 'https://www.reddit.com/r/aww/comments/12345/cute_cat/',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-[#FF4500]`}>
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.702zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    tag: 'Watch & Reels',
    dot: 'bg-blue-600',
    sampleUrl: 'https://www.facebook.com/watch/?v=123456789',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-[#1877F2]`}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    tag: 'Video Pins',
    dot: 'bg-red-600',
    sampleUrl: 'https://www.pinterest.com/pin/123456789/',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-[#BD081C]`}>
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    id: 'twitch',
    name: 'Twitch',
    tag: 'Clips & VODs',
    dot: 'bg-purple-500',
    sampleUrl: 'https://clips.twitch.tv/sample-clip',
    icon: (cls = 'w-4 h-4') => (
      <svg viewBox="0 0 24 24" className={`${cls} fill-[#9146FF]`}>
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    ),
  },
];

interface PlatformMarqueeProps {
  onSelectPlatform?: (platform: PlatformItem) => void;
}

export const PlatformMarquee: React.FC<PlatformMarqueeProps> = ({ onSelectPlatform }) => {
  // Seamless loop by duplicating items
  const duplicatedPlatforms = React.useMemo(
    () => [...PLATFORMS_CATALOG, ...PLATFORMS_CATALOG],
    []
  );

  return (
    <div className="w-full pt-1 select-none">
      {/* Outer gradient-masked container */}
      <div className="relative w-full overflow-hidden platform-marquee-mask py-1.5">
        <div className="flex w-max items-center gap-2.5 animate-marquee-track hover:[animation-play-state:paused] cursor-pointer">
          {duplicatedPlatforms.map((p, idx) => (
            <button
              key={`${p.id}-${idx}`}
              type="button"
              onClick={() => onSelectPlatform?.(p)}
              className="platform-chip flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.07] hover:border-white/20 transition-all duration-200 group shrink-0 shadow-sm active:scale-95 cursor-pointer"
              title={`Click to target ${p.name}`}
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                {p.icon()}
              </div>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors tracking-tight whitespace-nowrap">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
