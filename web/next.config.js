/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
    ],
  },
  async rewrites() {
    const backend = process.env.API_BACKEND_URL || 'http://127.0.0.1:4000';
    return [
      { source: '/api/:path*', destination: `${backend.replace(/\/$/, '')}/api/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy-Report-Only',
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://image.tmdb.org data:; connect-src 'self'; font-src 'self'; frame-src 'self' https://appleid.apple.com",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
