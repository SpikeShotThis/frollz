import type { NextConfig } from 'next';

const apiTarget = process.env['API_URL'] ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
