import { getRedis } from "./redis";
import type { Redis } from "@upstash/redis";

const memoryStore = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  ip: string,
  limit = 5,
  windowMs = 60000
): Promise<{ success: boolean; remaining: number }> {
  const r = getRedis();
  if (r) {
    return checkRateLimitRedis(r, ip, limit, windowMs);
  }
  return checkRateLimitMemory(memoryStore, ip, limit, windowMs);
}

async function checkRateLimitRedis(
  redis: Redis,
  ip: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const key = `rl:${ip}:${windowStart}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }
    const remaining = Math.max(0, limit - count);
    return { success: count <= limit, remaining };
  } catch {
    return { success: true, remaining: limit };
  }
}

function checkRateLimitMemory(
  store: Map<string, { count: number; resetTime: number }>,
  ip: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = store.get(ip);
  if (!record || now > record.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }
  record.count++;
  return { success: true, remaining: limit - record.count };
}