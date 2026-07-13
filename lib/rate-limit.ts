type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export function consumeAttestationLimit(key: string, now = Date.now()) {
  if (buckets.size > 5_000) {
    for (const [candidate, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(candidate);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfterSeconds: 0 };
  }
  if (current.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - current.count, retryAfterSeconds: 0 };
}

export function resetAttestationLimitsForTests() {
  buckets.clear();
}
