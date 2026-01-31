'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PosterImageProps {
  src: string | null;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const placeholderStyle = {
  background: 'var(--surface)',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  color: 'var(--muted)',
};

export function PosterImage({
  src,
  alt = '',
  width = 60,
  height = 90,
  className,
  style,
}: PosterImageProps) {
  const [failed, setFailed] = useState(false);
  const validSrc = typeof src === 'string' && src.length > 0;
  if (!validSrc || failed) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          ...placeholderStyle,
          ...style,
        }}
        title={failed ? 'Не удалось загрузить изображение' : undefined}
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
      unoptimized={!(typeof src === 'string' && src.startsWith('https://image.tmdb.org/'))}
      onError={() => setFailed(true)}
    />
  );
}
