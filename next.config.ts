import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['https://localhost:3000'],
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
