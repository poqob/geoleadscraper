import { sleep, randomize } from './interval';

export interface IRateLimiterOptions {
  controller?: AbortController;
  onCooldownChange?: (coolingDown: boolean, reason?: string) => void;
}

/**
 * Autonomous adaptive rate limiter for Google Maps scraping.
 * Automatically throttles request cadences based on cumulative request volume
 * and applies exponential cooldown backoff when rate-limiting signals occur.
 */
export class AdaptiveRateLimiter {
  private requestCount = 0;
  private consecutiveErrors = 0;
  private isCoolingDown = false;
  private controller?: AbortController;
  private onCooldownChange?: (coolingDown: boolean, reason?: string) => void;

  constructor(options?: IRateLimiterOptions) {
    this.controller = options?.controller;
    this.onCooldownChange = options?.onCooldownChange;
  }

  /**
   * Calculate current adaptive baseline delay based on cumulative request volume
   * (Thermal Throttling: smoothly increases delay as request count rises).
   */
  public getBaseDelay(): number {
    if (this.requestCount < 15) {
      return 1000; // Stage 1 (Initial / Green): ~1000ms
    } else if (this.requestCount < 35) {
      return 1600; // Stage 2 (Medium / Yellow): ~1600ms
    } else if (this.requestCount < 60) {
      return 2200; // Stage 3 (High / Orange): ~2200ms
    } else {
      return 2800; // Stage 4 (Saturated / Red): ~2800ms
    }
  }

  /**
   * Pause execution adaptively before sending the next request.
   * Applies random jitter to defeat pattern-based anti-bot detection.
   */
  public async wait(): Promise<void> {
    if (this.controller?.signal.aborted) return;

    const base = this.getBaseDelay();
    const delay = randomize(base);
    await sleep(delay);
  }

  /**
   * Record a successfully completed request.
   */
  public recordSuccess(): void {
    this.requestCount++;
    this.consecutiveErrors = 0;
  }

  /**
   * Handle rate-limit (HTTP 429), anomalous responses, or network blocks.
   * Enters autonomous cooldown mode for 5-12 seconds and notifies UI listener.
   */
  public async handleRateLimit(reason = 'Rate limit detected'): Promise<void> {
    if (this.controller?.signal.aborted) return;

    this.consecutiveErrors++;
    this.isCoolingDown = true;
    this.onCooldownChange?.(true, reason);

    // Cooldown duration scales with repeated offenses: 5s, 7.5s, 10s...
    const cooldownDuration = Math.min(15000, 5000 + (this.consecutiveErrors - 1) * 2500);
    await sleep(cooldownDuration);

    this.isCoolingDown = false;
    this.onCooldownChange?.(false);
  }

  public getStatus() {
    return {
      requestCount: this.requestCount,
      consecutiveErrors: this.consecutiveErrors,
      isCoolingDown: this.isCoolingDown,
      currentBaseDelay: this.getBaseDelay(),
    };
  }

  public reset(): void {
    this.requestCount = 0;
    this.consecutiveErrors = 0;
    this.isCoolingDown = false;
  }
}
