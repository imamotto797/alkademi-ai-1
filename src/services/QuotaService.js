class QuotaService {
  constructor() {
    // Store quota info with timestamps
    this.quotaInfo = {
      gemini: {
        requestsPerMinute: 600,
        requestsUsedThisMinute: 0,
        lastMinuteReset: Date.now(),
        monthlyTokens: null, // Requires API call to get
        monthlyTokensUsed: 0,
        monthResetDate: this.getMonthResetDate(),
        quotaExceeded: false,
        lastError: null
      },
      openai: {
        requestsPerMinute: null, // Varies by tier
        requestsUsedThisMinute: 0,
        lastMinuteReset: Date.now(),
        tokensUsed: 0,
        quotaExceeded: false,
        lastError: null
      },
      anthropic: {
        requestsPerMinute: null, // Varies by tier
        requestsUsedThisMinute: 0,
        lastMinuteReset: Date.now(),
        tokensUsed: 0,
        quotaExceeded: false,
        lastError: null
      },
      nvidia: {
        requestsPerMinute: null,
        requestsUsedThisMinute: 0,
        lastMinuteReset: Date.now(),
        tokensUsed: 0,
        quotaExceeded: false,
        lastError: null
      },
      deepseek: {
        requestsPerMinute: null,
        requestsUsedThisMinute: 0,
        lastMinuteReset: Date.now(),
        tokensUsed: 0,
        quotaExceeded: false,
        lastError: null
      },
      qwen: {
        requestsPerMinute: null,
        requestsUsedThisMinute: 0,
        lastMinuteReset: Date.now(),
        tokensUsed: 0,
        quotaExceeded: false,
        lastError: null
      },
      neon: {
        storageGB: 3,
        storageUsedGB: 0,
        lastChecked: Date.now()
      }
    };
  }

  // Get when monthly quota resets (Gemini resets on calendar month)
  getMonthResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  // Track API request for any provider
  trackRequest(provider, tokensUsed = 0, isSuccess = true, error = null) {
    if (!this.quotaInfo[provider]) return;
    
    const now = Date.now();
    const providerInfo = this.quotaInfo[provider];
    
    // Reset minute counter if minute has passed
    if (now - providerInfo.lastMinuteReset > 60000) {
      providerInfo.requestsUsedThisMinute = 0;
      providerInfo.lastMinuteReset = now;
    }
    
    // Increment counters
    providerInfo.requestsUsedThisMinute++;
    
    if (provider === 'gemini') {
      providerInfo.monthlyTokensUsed += tokensUsed;
    } else {
      providerInfo.tokensUsed += tokensUsed;
    }
    
    // Track errors
    if (!isSuccess && error) {
      providerInfo.lastError = {
        message: error,
        timestamp: now
      };
      
      // Check if quota exceeded
      if (error.includes('quota') || error.includes('429') || error.includes('exceeded')) {
        providerInfo.quotaExceeded = true;
      }
    } else if (isSuccess) {
      providerInfo.quotaExceeded = false;
      providerInfo.lastError = null;
    }
    
    return this.getQuotaStatus();
  }

  // Legacy method for backward compatibility
  trackGeminiRequest(tokensUsed = 0) {
    return this.trackRequest('gemini', tokensUsed, true, null);
  }

  // Check if rate limit exceeded
  isRateLimitExceeded() {
    return this.quotaInfo.gemini.requestsUsedThisMinute >= this.quotaInfo.gemini.requestsPerMinute;
  }

  // Get formatted quota status
  getQuotaStatus() {
    const gemini = this.quotaInfo.gemini;
    const openai = this.quotaInfo.openai;
    const anthropic = this.quotaInfo.anthropic;
    const neon = this.quotaInfo.neon;
    
    const now = Date.now();
    const geminiMinuteResetIn = 60 - Math.floor((now - gemini.lastMinuteReset) / 1000);
    const openaiMinuteResetIn = 60 - Math.floor((now - openai.lastMinuteReset) / 1000);
    const anthropicMinuteResetIn = 60 - Math.floor((now - anthropic.lastMinuteReset) / 1000);
    const monthResetIn = Math.ceil((gemini.monthResetDate - now) / (1000 * 60 * 60 * 24));
    
    return {
      gemini: {
        requestsPerMinute: {
          current: gemini.requestsUsedThisMinute,
          limit: gemini.requestsPerMinute,
          percentageUsed: ((gemini.requestsUsedThisMinute / gemini.requestsPerMinute) * 100).toFixed(1),
          resetsIn: `${geminiMinuteResetIn} seconds`,
          exceeded: gemini.quotaExceeded
        },
        monthlyTokens: {
          used: gemini.monthlyTokensUsed,
          limit: gemini.monthlyTokens || 'Not set',
          resetsOn: gemini.monthResetDate.toLocaleDateString(),
          daysUntilReset: monthResetIn
        },
        status: gemini.quotaExceeded ? 'quota_exceeded' : 'available',
        lastError: gemini.lastError
      },
      openai: {
        requestsThisMinute: openai.requestsUsedThisMinute,
        tokensUsed: openai.tokensUsed,
        resetsIn: `${openaiMinuteResetIn} seconds`,
        status: openai.quotaExceeded ? 'quota_exceeded' : 'available',
        lastError: openai.lastError
      },
      anthropic: {
        requestsThisMinute: anthropic.requestsUsedThisMinute,
        tokensUsed: anthropic.tokensUsed,
        resetsIn: `${anthropicMinuteResetIn} seconds`,
        status: anthropic.quotaExceeded ? 'quota_exceeded' : 'available',
        lastError: anthropic.lastError
      },
      nvidia: {
        requestsThisMinute: this.quotaInfo.nvidia.requestsUsedThisMinute,
        tokensUsed: this.quotaInfo.nvidia.tokensUsed,
        resetsIn: `${60 - Math.floor((now - this.quotaInfo.nvidia.lastMinuteReset) / 1000)} seconds`,
        status: this.quotaInfo.nvidia.quotaExceeded ? 'quota_exceeded' : 'available',
        lastError: this.quotaInfo.nvidia.lastError
      },
      deepseek: {
        requestsThisMinute: this.quotaInfo.deepseek.requestsUsedThisMinute,
        tokensUsed: this.quotaInfo.deepseek.tokensUsed,
        resetsIn: `${60 - Math.floor((now - this.quotaInfo.deepseek.lastMinuteReset) / 1000)} seconds`,
        status: this.quotaInfo.deepseek.quotaExceeded ? 'quota_exceeded' : 'available',
        lastError: this.quotaInfo.deepseek.lastError
      },
      qwen: {
        requestsThisMinute: this.quotaInfo.qwen.requestsUsedThisMinute,
        tokensUsed: this.quotaInfo.qwen.tokensUsed,
        resetsIn: `${60 - Math.floor((now - this.quotaInfo.qwen.lastMinuteReset) / 1000)} seconds`,
        status: this.quotaInfo.qwen.quotaExceeded ? 'quota_exceeded' : 'available',
        lastError: this.quotaInfo.qwen.lastError
      },
      neon: {
        storage: {
          used: neon.storageUsedGB,
          limit: neon.storageGB,
          percentageUsed: ((neon.storageUsedGB / neon.storageGB) * 100).toFixed(1),
          lastChecked: new Date(neon.lastChecked).toISOString(),
          warning: neon.storageUsedGB > (neon.storageGB * 0.8)
        }
      }
    };
  }

  // Format error message for quota exceeded
  getQuotaErrorMessage(service) {
    const status = this.getQuotaStatus();
    
    if (service === 'gemini-rate-limit') {
      const rpm = status.gemini.requestsPerMinute;
      return {
        title: '⏱️ API Rate Limit Exceeded',
        message: `You've made ${rpm.current}/${rpm.limit} requests this minute. Please wait ${rpm.resetsIn} before trying again.`,
        type: 'warning',
        retryAfter: Math.ceil((Date.now() - this.quotaInfo.gemini.lastMinuteReset) / 1000) + 60
      };
    }
    
    if (service === 'gemini-quota') {
      const monthly = status.gemini.monthlyTokens;
      return {
        title: '💾 Monthly Quota Exceeded',
        message: `You've used your monthly token quota. It will reset on ${monthly.resetsOn} (in ${monthly.daysUntilReset} days).`,
        type: 'error',
        retryAfter: monthly.daysUntilReset * 86400
      };
    }
    
    if (service === 'neon-storage') {
      const storage = status.neon.storage;
      return {
        title: '📦 Database Storage Full',
        message: `You've used ${storage.used}/${storage.limit} GB of database storage. Please upgrade your Neon plan or delete old materials.`,
        type: 'error',
        retryAfter: null
      };
    }
  }

  // Log quota status
  logQuotaStatus() {
    const status = this.getQuotaStatus();
    console.log('\n=== QUOTA STATUS ===');
    console.log('Gemini:', {
      status: status.gemini.status,
      requests: `${status.gemini.requestsPerMinute.current}/${status.gemini.requestsPerMinute.limit}`,
      tokens: status.gemini.monthlyTokens.used
    });
    console.log('OpenAI:', {
      status: status.openai.status,
      requests: status.openai.requestsThisMinute,
      tokens: status.openai.tokensUsed
    });
    console.log('Anthropic:', {
      status: status.anthropic.status,
      requests: status.anthropic.requestsThisMinute,
      tokens: status.anthropic.tokensUsed
    });
    console.log('Neon Database:', status.neon.storage);
    console.log('===================\n');
  }
}

module.exports = new QuotaService();
