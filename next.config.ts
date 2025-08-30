import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['https://localhost:3000'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*'
      }
    ]
  },
  output: 'standalone',
  serverExternalPackages: ['bullmq', 'ioredis', 'pino'],
  typedRoutes: true
}

export default nextConfig
