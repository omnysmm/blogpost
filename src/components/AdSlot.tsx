import { useEffect, useRef, useState } from 'react';
import type { AdCampaign, AdPosition } from '../services/ads';
import { selectAdForPosition, trackClick, trackImpression } from '../services/ads';

interface AdSlotProps {
  position: AdPosition;
  /** Override selection (e.g. from store) */
  campaign?: AdCampaign | null;
  className?: string;
  /** Called when user clicks the ad */
  onAdClick?: (c: AdCampaign) => void;
}

/**
 * Renders one advertising placement (hero | sidebar | inline | footer).
 * Counts an impression once per mount (viewport-aware), tracks clicks.
 */
export default function AdSlot({ position, campaign, className = '', onAdClick }: AdSlotProps) {
  const [ad, setAd] = useState<AdCampaign | null>(campaign ?? null);
  const ref = useRef<HTMLDivElement | null>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (campaign) {
      setAd(campaign);
      return;
    }
    setAd(selectAdForPosition(position));
  }, [campaign, position]);

  useEffect(() => {
    counted.current = false;
  }, [ad?.id]);

  useEffect(() => {
    if (!ad || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting && !counted.current) {
            counted.current = true;
            trackImpression(ad.id, position);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ad?.id, position]);

  if (!ad) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackClick(ad.id, position);
    onAdClick?.(ad);
    const href = ad.link && ad.link !== '#' ? ad.link : '';
    if (href && /^https?:\/\//i.test(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const sizeClass =
    position === 'hero'
      ? 'min-h-[80px] text-center py-6 px-6'
      : position === 'footer'
        ? 'min-h-[64px] text-center py-4 px-4'
        : position === 'sidebar'
          ? 'min-h-[120px] p-4'
          : 'min-h-[72px] p-4';

  return (
    <div
      ref={ref}
      data-testid={`ad-slot-${position}`}
      className={`relative overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 ${sizeClass} ${className}`}
    >
      <span className="absolute top-1 right-2 text-[10px] uppercase tracking-wide text-slate-400 select-none">
        реклама
      </span>
      <a
        href="#"
        onClick={handleClick}
        className="block text-left no-underline"
        aria-label={`Реклама: ${ad.title}`}
      >
        {ad.imageUrl ? (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full h-auto max-h-40 object-cover rounded-lg mb-2"
            loading="lazy"
          />
        ) : null}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm sm:text-base">{ad.title}</p>
            {ad.description ? (
              <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{ad.description}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
            Подробнее
          </span>
        </div>
      </a>
    </div>
  );
}
