// Real brand logo icons for social networks (inline SVG)

type SocialId = 'vk' | 'telegram' | 'youtube' | 'instagram' | 'tiktok' | 'ok' | 'rutube';

interface SocialIconProps {
  id: SocialId | string;
  size?: number;
  className?: string;
  /** Render monochrome (for light backgrounds) instead of full brand color */
  mono?: boolean;
}

const BRAND: Record<SocialId, string> = {
  vk: '#0077FF',
  telegram: '#26A5E4',
  youtube: '#FF0000',
  instagram: '#E1306C',
  tiktok: '#010101',
  ok: '#EE8208',
  rutube: '#0ECF6C',
};

export const SOCIAL_META: Record<SocialId, { name: string; short: string; color: string }> = {
  vk: { name: 'VK', short: 'VK', color: BRAND.vk },
  telegram: { name: 'Telegram', short: 'TG', color: BRAND.telegram },
  youtube: { name: 'YouTube', short: 'YT', color: BRAND.youtube },
  instagram: { name: 'Instagram', short: 'IG', color: BRAND.instagram },
  tiktok: { name: 'TikTok', short: 'TK', color: BRAND.tiktok },
  ok: { name: 'ОК', short: 'ОК', color: BRAND.ok },
  rutube: { name: 'Rutube', short: 'RT', color: BRAND.rutube },
};

export const SOCIAL_IDS: SocialId[] = ['vk', 'telegram', 'youtube', 'instagram', 'tiktok', 'ok', 'rutube'];

export default function SocialIcon({ id, size = 24, className = '', mono = false }: SocialIconProps) {
  const key = id as SocialId;
  const fill = mono ? 'currentColor' : (BRAND[key] || '#64748B');
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    className,
    'aria-hidden': true as const,
  };

  switch (key) {
    case 'vk':
      // Official-style VK mark: brand-blue rounded square + white VK
      return (
        <svg {...common}>
          {mono ? (
            <path
              fill={fill}
              d="M4.2 7.2h2.5l2.55 5.55L11.8 7.2h2.5l-3.85 8.3H8.05L4.2 7.2zm9.3 0h2.35v3.45L18.7 7.2h2.85l-3.55 4.25 3.75 5.25h-2.85l-2.55-3.75-.35.4v3.35h-2.35V7.2z"
            />
          ) : (
            <>
              <rect x="1" y="1" width="22" height="22" rx="6" fill={fill} />
              <path
                fill="#fff"
                d="M4.2 7.2h2.5l2.55 5.55L11.8 7.2h2.5l-3.85 8.3H8.05L4.2 7.2zm9.3 0h2.35v3.45L18.7 7.2h2.85l-3.55 4.25 3.75 5.25h-2.85l-2.55-3.75-.35.4v3.35h-2.35V7.2z"
              />
            </>
          )}
        </svg>
      );

    case 'telegram':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill={fill} />
          <path
            fill="#fff"
            d="M16.8 7.4 6.9 11.2c-.62.24-.62.58-.11.73l2.53.79.97 2.97c.12.33.06.46.38.46.25 0 .36-.11.5-.25.09-.09 1.05-1.02 2.05-2l2.3 1.7c.42.23.73.11.83-.39l1.52-7.13c.15-.61-.24-.88-.65-.71z"
          />
        </svg>
      );

    case 'youtube':
      return (
        <svg {...common}>
          <rect x="1.5" y="5" width="21" height="14" rx="4" fill={fill} />
          <path fill="#fff" d="M10 9.5v5l5.2-2.5L10 9.5z" />
        </svg>
      );

    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" stroke={fill} strokeWidth="2" />
          <circle cx="12" cy="12" r="4.2" stroke={fill} strokeWidth="2" />
          <circle cx="17.2" cy="6.8" r="1.3" fill={fill} />
        </svg>
      );

    case 'tiktok':
      return (
        <svg {...common}>
          <path
            fill={fill}
            d="M16.5 3h-2.7v12.1a2.4 2.4 0 1 1-2.1-2.37V9.95a5.3 5.3 0 1 0 4.8 5.27V8.9a6.4 6.4 0 0 0 3.5 1.05V7.2A3.7 3.7 0 0 1 16.5 3z"
          />
        </svg>
      );

    case 'ok':
      // Official-style OK mark: brand-orange rounded square + white OK
      return (
        <svg {...common}>
          {mono ? (
            <path
              fill={fill}
              d="M12 5.2c-1.85 0-3.35 1.55-3.35 3.45S10.15 12.1 12 12.1s3.35-1.55 3.35-3.45S13.85 5.2 12 5.2zm0 1.5c1 0 1.85.9 1.85 1.95S13 10.6 12 10.6s-1.85-.9-1.85-1.95S11 6.7 12 6.7zM7.2 12.4h2.4v2.35l2.4-2.35h2.9l-3.35 3.2 3.55 4.2h-2.85L12 15.85 10.3 17.6H7.95l3.55-4.2L8.15 10.2h-.95v2.2zm6.3 0h2.5c1.9 0 3.35 1.35 3.35 3.25S17.9 18.9 16 18.9h-2.5v-6.5zm2.5 1.4h-.15v3.7H16c1.15 0 1.9-.8 1.9-1.85s-.75-1.85-1.9-1.85z"
            />
          ) : (
            <>
              <rect x="1" y="1" width="22" height="22" rx="6" fill={fill} />
              {/* O */}
              <path
                fill="#fff"
                d="M12 5.85c-1.75 0-3.15 1.45-3.15 3.25S10.25 12.35 12 12.35s3.15-1.45 3.15-3.25S13.75 5.85 12 5.85zm0 1.45c.95 0 1.7.8 1.7 1.8s-.75 1.8-1.7 1.8-1.7-.8-1.7-1.8.75-1.8 1.7-1.8z"
              />
              {/* K */}
              <path
                fill="#fff"
                d="M8.15 12.55h2.55v2.7l2.55-2.7h3.05l-3.5 3.35 3.7 4.25h-3l-2.8-3.35-.3.3v3.05H8.15v-6.6zm7.2 0H17.9c1.75 0 3.05 1.25 3.05 2.95s-1.3 2.95-3.05 2.95h-2.55v-5.9zm2.55 1.35c.85 0 1.45.65 1.45 1.6s-.6 1.6-1.45 1.6h-.1v-3.2h.1z"
              />
            </>
          )}
        </svg>
      );

    case 'rutube':
      return (
        <svg {...common}>
          <rect x="2" y="2" width="20" height="20" rx="5" fill={fill} />
          <path fill="#fff" d="M9 7.8v8.4c0 .5.55.8.98.55l6.5-4.2a.65.65 0 0 0 0-1.1l-6.5-4.2a.65.65 0 0 0-.98.55z" />
          <path fill="#fff" opacity=".85" d="M7 7.2h1.5v9.6H7z" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill={fill} />
        </svg>
      );
  }
}

/** Round badge with brand logo (for tables / lists) */
export function SocialLogo({ id, size = 32, className = '' }: { id: string; size?: number; className?: string }) {
  const key = id as SocialId;
  const color = BRAND[key] || '#64748B';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl shrink-0 ${className}`}
      style={{ width: size, height: size, background: `${color}18` }}
    >
      <SocialIcon id={id} size={Math.round(size * 0.62)} />
    </span>
  );
}
