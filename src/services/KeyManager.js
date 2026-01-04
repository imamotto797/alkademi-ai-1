/**
 * KeyManager - Manages multiple API keys with quota tracking and failover
 */
class KeyManager {
  constructor() {
    // Parse comma-separated API keys from environment
    const keysString = process.env.GEMINI_API_KEYS || '';
    this.keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (this.keys.length === 0) {
      throw new Error('No GEMINI_API_KEYS found in environment variables. Please set GEMINI_API_KEYS as comma-separated values.');
    }
    
    // Track quota per key
    this.keyQuota = {};
    this.keyErrors = {};
    this.currentKeyIndex = 0;
    
    // Initialize tracking for each key
    this.keys.forEach((key, idx) => {
      const maskedKey = this.maskKey(key);
      this.keyQuota[idx] = {
        requests: 0,
        lastReset: Date.now(),
        hourlyQuota: false
      };
      this.keyErrors[idx] = {
        count: 0,
        lastError: null,
        quotaExceededAt: null
      };
      console.log(`🔑 Key ${idx + 1}/${this.keys.length} registered: ${maskedKey}`);
    });
  }

  /**
   * Get the next available API key
   * Returns null if all keys are quota-limited
   */
  getNextKey() {
    const startIndex = this.currentKeyIndex;
    let attempts = 0;

    while (attempts < this.keys.length) {
      const idx = this.currentKeyIndex;
      const keyStatus = this.keyErrors[idx];

      // Skip keys that hit quota in last 5 minutes
      if (keyStatus.quotaExceededAt && Date.now() - keyStatus.quotaExceededAt < 5 * 60 * 1000) {
        console.log(`⏭️  Key ${idx + 1} still in cooldown (quota), trying next...`);
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        attempts++;
        continue;
      }

      // Reset cooldown if 5 minutes have passed
      if (keyStatus.quotaExceededAt && Date.now() - keyStatus.quotaExceededAt >= 5 * 60 * 1000) {
        console.log(`♻️  Key ${idx + 1} cooldown expired, retrying...`);
        keyStatus.quotaExceededAt = null;
      }

      return this.keys[idx];
    }

    console.error('❌ All API keys are quota-limited. Please add more keys or wait for reset.');
    return null;
  }

  /**
   * Mark a key as having hit quota
   */
  markQuotaExceeded(key) {
    const idx = this.keys.indexOf(key);
    if (idx !== -1) {
      this.keyErrors[idx].quotaExceededAt = Date.now();
      const maskedKey = this.maskKey(key);
      console.log(`❌ Key ${idx + 1} (${maskedKey}) marked as quota-limited. Cooldown: 5 minutes`);
    }
  }

  /**
   * Track a successful request
   */
  trackRequest(key) {
    const idx = this.keys.indexOf(key);
    if (idx !== -1) {
      this.keyQuota[idx].requests++;
      
      // Reset hourly counter if > 60 mins
      const timeSinceReset = Date.now() - this.keyQuota[idx].lastReset;
      if (timeSinceReset > 60 * 60 * 1000) {
        this.keyQuota[idx].requests = 1;
        this.keyQuota[idx].lastReset = Date.now();
      }
    }
  }

  /**
   * Get quota status for all keys
   */
  getQuotaStatus() {
    const status = {};
    this.keys.forEach((key, idx) => {
      const maskedKey = this.maskKey(key);
      const quota = this.keyQuota[idx];
      const errors = this.keyErrors[idx];
      
      status[`key_${idx + 1}`] = {
        maskedKey,
        requestsThisHour: quota.requests,
        hourlyLimit: 60, // Google's free tier limit
        percentageUsed: ((quota.requests / 60) * 100).toFixed(1),
        quotaExceeded: !!errors.quotaExceededAt,
        cooldownMinutesRemaining: errors.quotaExceededAt
          ? Math.ceil((5 * 60 * 1000 - (Date.now() - errors.quotaExceededAt)) / 60 / 1000)
          : 0,
        lastError: errors.lastError
      };
    });
    
    return {
      totalKeys: this.keys.length,
      currentKeyIndex: this.currentKeyIndex,
      keys: status
    };
  }

  /**
   * Mask API key for safe logging (show first 5 and last 5 chars)
   */
  maskKey(key) {
    if (key.length <= 10) return '***';
    return `${key.substring(0, 5)}...${key.substring(key.length - 5)}`;
  }

  /**
   * Record an error for a key
   */
  recordError(key, error) {
    const idx = this.keys.indexOf(key);
    if (idx !== -1) {
      this.keyErrors[idx].count++;
      this.keyErrors[idx].lastError = error.message || error;
    }
  }

  /**
   * Get total number of keys
   */
  getKeyCount() {
    return this.keys.length;
  }

  /**
   * Check if we have a working key available
   */
  hasAvailableKey() {
    return this.getNextKey() !== null;
  }
}

module.exports = new KeyManager();
