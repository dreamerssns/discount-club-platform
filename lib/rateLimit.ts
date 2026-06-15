import { connectDB } from './mongodb';
import RateLimit from '@/models/rateLimit';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  action: string,
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  await connectDB();

  const key = `${action}:${identifier}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const doc = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // If the doc expired but TTL hasn't cleaned it yet, reset it
  if (doc.expiresAt < now) {
    await RateLimit.updateOne({ key }, { count: 1, expiresAt });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  const remaining = Math.max(0, maxAttempts - doc.count);
  return { allowed: doc.count <= maxAttempts, remaining };
}
