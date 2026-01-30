/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

module.exports = nextConfig;
