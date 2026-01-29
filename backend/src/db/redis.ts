import { createRequire } from 'module';

const require = createRequire(import.meta.url);
type RedisClient = { get: (k: string) => Promise<string | null>; setex: (k: string, ttl: number, v: string) => Promise<unknown>; ping: () => Promise<string> };

const Redis = require('ioredis');
let redis: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url) as RedisClient;
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  const raw = await r.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  await r.setex(key, ttlSeconds, JSON.stringify(value));
}
