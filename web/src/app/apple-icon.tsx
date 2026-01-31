import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Логотип Pairly — два переплетённых кольца (как в PairlyLogoMark).
 * Рисуем кругами через div, чтобы не зависеть от рендеринга SVG path в Satori.
 */
export default function AppleIcon() {
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
          borderRadius: 36,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 100,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Левое кольцо */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              marginTop: -40,
              width: 80,
              height: 80,
              borderRadius: 40,
              border: '10px solid white',
              background: 'transparent',
            }}
          />
          {/* Правое кольцо */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              marginTop: -40,
              width: 80,
              height: 80,
              borderRadius: 40,
              border: '10px solid white',
              background: 'transparent',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
