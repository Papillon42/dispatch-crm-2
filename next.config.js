/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'pdf-parse'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
