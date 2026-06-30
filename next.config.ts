import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
