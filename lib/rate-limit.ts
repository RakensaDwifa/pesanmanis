import { getRedis } from "./redis";
import type { Redis } from "@upstash/redis";

const MAX_MEMORY_ENTRIES = 5000;
const memoryStore = new Map<string, { count: number; resetTime: number }>();

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

function pruneMemoryStore(now: number) {
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
  // If still above cap after removing expired records, evict oldest entries.
  while (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey === undefined) break;
    memoryStore.delete(oldestKey);
  }
}

export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60000
): Promise<{ success: boolean; remaining: number }> {
  const r = getRedis();
  if (r) {
    return checkRateLimitRedis(r, key, limit, windowMs);
  }
  return checkRateLimitMemory(memoryStore, key, limit, windowMs);
}

async function checkRateLimitRedis(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const redisKey = `rl:${key}:${windowStart}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
    }
    const remaining = Math.max(0, limit - count);
    return { success: count <= limit, remaining };
  } catch (err) {
    console.warn("[rate-limit] Redis error, falling back to in-memory limiter:", err);
    return checkRateLimitMemory(memoryStore, key, limit, windowMs);
  }
}

function checkRateLimitMemory(
  store: Map<string, { count: number; resetTime: number }>,
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  if (store.size >= MAX_MEMORY_ENTRIES) {
    pruneMemoryStore(now);
  }
  const record = store.get(key);
  if (!record || now > record.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: Math.max(0, limit - 1) };
  }
  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }
  record.count += 1;
  return { success: true, remaining: Math.max(0, limit - record.count) };
}
