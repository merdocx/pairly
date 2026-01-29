'use client';

import Image from 'next/image';

interface PosterImageProps {
  src: string | null;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PosterImage({
  src,
  alt = '',
  width = 60,
  height = 90,
  className,
  style,
}: PosterImageProps) {
  if (!src) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          background: 'var(--surface)',
          borderRadius: 4,
          ...style,
        }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'cover', borderRadius: 4, ...style }}
      unoptimized={!src.startsWith('https://image.tmdb.org/')}
    />
  );
}
