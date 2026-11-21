import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  aspectClassName?: string;
}

/**
 * Editorial image container with graceful CSS/SVG fallback if an image is missing or fails to load.
 */
export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  aspectClassName = 'aspect-video',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-6 text-center text-neutral-500 dark:border-[#242730] dark:bg-[#14161B] dark:text-neutral-400 ${aspectClassName} ${className}`}
        role="img"
        aria-label={alt || fallbackLabel || 'Article visual'}
      >
        <ImageIcon className="h-6 w-6 opacity-50" strokeWidth={1.5} />
        <span className="max-w-xs text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
          {fallbackLabel || alt || 'Editorial cover visual'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
