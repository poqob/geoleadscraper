import { describe, expect, it, vi } from 'vitest';
import { AdaptiveRateLimiter } from './rate-limiter';

describe('AdaptiveRateLimiter tests', () => {
  it('scales base delay based on request volume (thermal throttling)', () => {
    const limiter = new AdaptiveRateLimiter();
    expect(limiter.getBaseDelay()).toBe(1000);

    // Simulate 20 requests
    for (let i = 0; i < 20; i++) {
      limiter.recordSuccess();
    }
    expect(limiter.getBaseDelay()).toBe(1600);

    // Simulate up to 40 requests
    for (let i = 20; i < 40; i++) {
      limiter.recordSuccess();
    }
    expect(limiter.getBaseDelay()).toBe(2200);

    // Simulate up to 70 requests
    for (let i = 40; i < 70; i++) {
      limiter.recordSuccess();
    }
    expect(limiter.getBaseDelay()).toBe(2800);
  });

  it('triggers cooldown callback and increases cooldown on repeated rate limits', async () => {
    vi.useFakeTimers();

    const onCooldownChange = vi.fn();
    const limiter = new AdaptiveRateLimiter({ onCooldownChange });

    const handlePromise = limiter.handleRateLimit('HTTP 429');
    expect(onCooldownChange).toHaveBeenCalledWith(true, 'HTTP 429');

    // Advance time past the 5000ms initial cooldown
    await vi.advanceTimersByTimeAsync(5100);
    await handlePromise;

    expect(onCooldownChange).toHaveBeenCalledWith(false);
    expect(limiter.getStatus().consecutiveErrors).toBe(1);

    vi.useRealTimers();
  });

  it('resets counters on reset() call', () => {
    const limiter = new AdaptiveRateLimiter();
    limiter.recordSuccess();
    limiter.recordSuccess();
    expect(limiter.getStatus().requestCount).toBe(2);

    limiter.reset();
    expect(limiter.getStatus().requestCount).toBe(0);
    expect(limiter.getStatus().consecutiveErrors).toBe(0);
  });
});
