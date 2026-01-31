import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Логотип Pairly — два переплетённых кольца (как в PairlyLogoMark).
 * Рисуем кругами через div для стабильного рендеринга.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #9810fa 0%, #e60076 100%)',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 20,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              marginTop: -8,
              width: 16,
              height: 16,
              borderRadius: 8,
              border: '2.5px solid white',
              background: 'transparent',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              marginTop: -8,
              width: 16,
              height: 16,
              borderRadius: 8,
              border: '2.5px solid white',
              background: 'transparent',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
