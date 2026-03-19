/**
 * Simple in-memory rate limiter.
 * Tracks requests per key (IP or agent ID) with sliding window.
 * Fine for single-instance Vercel deployments.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

export function rateLimit(
  namespace: string,
  key: string,
  limit: number,
  windowMs: number = 3600000 // 1 hour default
): { allowed: boolean; remaining: number; resetAt: number } {
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map())
  }
  const store = stores.get(namespace)!

  const now = Date.now()
  const entry = store.get(key)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    store.forEach((v, k) => {
      if (v.resetAt < now) store.delete(k)
    })
  }

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Extract a rate limit key from a request.
 * Uses X-Forwarded-For (Vercel), then falls back to a generic key.
 */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'anonymous'
}
