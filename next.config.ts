import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*'
      }
    ]
  },
  output: 'standalone',
  serverExternalPackages: ['bullmq', 'ioredis', 'pino']
}

export default nextConfig
