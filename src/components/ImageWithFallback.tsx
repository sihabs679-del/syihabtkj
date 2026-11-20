import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackLabel = 'SMK Prima Unggul',
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-red-950 via-red-900 to-zinc-900 text-white p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Building2 className="w-10 h-10 text-red-200 mb-3" />
        <span className="text-sm font-semibold tracking-tight text-center">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
