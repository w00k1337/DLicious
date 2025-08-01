import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*'
      }
    ]
  },
  output: 'standalone',
  serverExternalPackages: ['bullmq', 'pino']
}

export default nextConfig
