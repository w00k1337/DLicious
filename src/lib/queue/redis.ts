/**
 * Redis Connection Singleton
 *
 * Provides a single Redis connection instance with proper lifecycle management,
 * error handling, and graceful shutdown capabilities.
 */

import { Redis } from 'ioredis'

import logger from '@/lib/logger'

import { createRedisConfig } from './config'
import type { RedisConfig } from './types'

/**
 * Custom error class for Redis connection issues
 */
export class RedisConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'RedisConnectionError'
  }
}

/**
 * Redis connection singleton class
 */
class RedisConnection {
  private static instance: RedisConnection | null = null
  private redis: Redis | null = null
  private isConnecting = false
  private isShuttingDown = false
  private connectionPromise: Promise<Redis> | null = null

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RedisConnection {
    RedisConnection.instance ??= new RedisConnection()
    return RedisConnection.instance
  }

  /**
   * Get or create Redis connection
   */
  public async getConnection(): Promise<Redis> {
    if (this.isShuttingDown) {
      throw new RedisConnectionError('Redis connection is shutting down')
    }

    if (this.redis && this.redis.status === 'ready') {
      return this.redis
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this.createConnection()
    return this.connectionPromise
  }

  /**
   * Create a new Redis connection
   */
  private async createConnection(): Promise<Redis> {
    if (this.isConnecting) {
      throw new RedisConnectionError('Already attempting to connect to Redis')
    }

    this.isConnecting = true

    try {
      const config = createRedisConfig()
      logger.info('Attempting to connect to Redis', {
        host: config.host,
        port: config.port,
        db: config.db
      })

      this.redis = this.createRedisInstance(config)

      await this.waitForConnection()

      this.setupEventHandlers()

      logger.info('Successfully connected to Redis')
      return this.redis
    } catch (error) {
      this.isConnecting = false
      this.redis = null
      this.connectionPromise = null

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to connect to Redis', { error: errorMessage })

      throw new RedisConnectionError(
        `Failed to establish Redis connection: ${errorMessage}`,
        error instanceof Error ? error : undefined
      )
    } finally {
      this.isConnecting = false
    }
  }

  /**
   * Create Redis instance with configuration
   */
  private createRedisInstance(config: RedisConfig): Redis {
    const redisOptions = {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      db: config.db ?? 0,
      maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
      retryDelayOnFailover: config.retryDelayOnFailover ?? 100,
      maxmemoryPolicy: config.maxmemoryPolicy,

      // Connection options
      connectTimeout: 10000, // 10 seconds
      lazyConnect: true, // Don't connect immediately
      keepAlive: 30000, // 30 seconds

      // Retry configuration
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false // Fail fast when disconnected
    }

    return new Redis(redisOptions)
  }

  /**
   * Wait for Redis connection to be ready
   */
  private async waitForConnection(): Promise<void> {
    if (!this.redis) {
      throw new RedisConnectionError('Redis instance not created')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new RedisConnectionError('Redis connection timeout'))
      }, 15000) // 15 second timeout

      if (!this.redis) {
        clearTimeout(timeout)
        reject(new RedisConnectionError('Redis instance not available'))
        return
      }

      this.redis
        .connect()
        .then(() => {
          clearTimeout(timeout)
          resolve()
        })
        .catch((error: unknown) => {
          clearTimeout(timeout)
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  }

  /**
   * Set up Redis event handlers
   */
  private setupEventHandlers(): void {
    if (!this.redis) return

    this.redis.on('connect', () => {
      logger.debug('Redis connection established')
    })

    this.redis.on('ready', () => {
      logger.info('Redis connection ready')
    })

    this.redis.on('error', error => {
      logger.error('Redis connection error', { error: error.message })
    })

    this.redis.on('close', () => {
      logger.warn('Redis connection closed')
    })

    this.redis.on('reconnecting', (delay: number) => {
      logger.info('Redis reconnecting', { delay })
    })

    this.redis.on('end', () => {
      logger.warn('Redis connection ended')
    })
  }

  /**
   * Check if Redis is connected and ready
   */
  public isConnected(): boolean {
    return this.redis?.status === 'ready'
  }

  /**
   * Get connection status
   */
  public getStatus(): string {
    return this.redis?.status ?? 'disconnected'
  }

  /**
   * Gracefully disconnect from Redis
   */
  public disconnect(): void {
    if (this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true

    try {
      if (this.redis) {
        logger.info('Closing Redis connection')
        this.redis.disconnect()
        this.redis = null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error while closing Redis connection', { error: errorMessage })
    } finally {
      this.isShuttingDown = false
      this.connectionPromise = null
      this.isConnecting = false
    }
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static reset(): void {
    if (RedisConnection.instance) {
      RedisConnection.instance.disconnect()
      RedisConnection.instance = null
    }
  }
}

/**
 * Get the Redis connection singleton instance
 */
export const getRedisConnection = (): Promise<Redis> => {
  return RedisConnection.getInstance().getConnection()
}

/**
 * Check if Redis is connected
 */
export const isRedisConnected = (): boolean => {
  return RedisConnection.getInstance().isConnected()
}

/**
 * Get Redis connection status
 */
export const getRedisStatus = (): string => {
  return RedisConnection.getInstance().getStatus()
}

/**
 * Gracefully disconnect from Redis
 */
export const disconnectRedis = (): void => {
  RedisConnection.getInstance().disconnect()
}

/**
 * Reset Redis singleton (for testing)
 */
export const resetRedisConnection = (): void => {
  RedisConnection.reset()
}
