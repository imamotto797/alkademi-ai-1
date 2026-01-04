/**
 * ProviderReliabilityManager - Tracks provider performance and enables smart fallback
 */

class ProviderMetrics {
    constructor(providerId) {
        this.providerId = providerId;
        this.successCount = 0;
        this.failureCount = 0;
        this.lastError = null;
        this.lastErrorTime = null;
        this.responseTime = [];
        this.quotaExceeded = false;
        this.lastChecked = Date.now();
    }

    addSuccess(responseTimeMs) {
        this.successCount++;
        this.responseTime.push(responseTimeMs);
        
        // Keep only last 100 response times
        if (this.responseTime.length > 100) {
            this.responseTime.shift();
        }
    }

    addFailure(error) {
        this.failureCount++;
        this.lastError = error.message || error;
        this.lastErrorTime = Date.now();
    }

    getSuccessRate() {
        const total = this.successCount + this.failureCount;
        if (total === 0) return 100; // No failures yet
        return (this.successCount / total) * 100;
    }

    getAverageResponseTime() {
        if (this.responseTime.length === 0) return 0;
        const sum = this.responseTime.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.responseTime.length);
    }

    getReliabilityScore() {
        const successRate = this.getSuccessRate();
        const avgTime = this.getAverageResponseTime();
        
        // Score: 0-100
        // 50% weight on success rate, 50% on response time (preferring faster)
        const timeScore = Math.max(0, 100 - (avgTime / 10)); // Penalize slow responses
        return (successRate * 0.5) + (timeScore * 0.5);
    }

    getStatus() {
        return {
            providerId: this.providerId,
            successRate: this.getSuccessRate().toFixed(2) + '%',
            failureCount: this.failureCount,
            averageResponseTime: this.getAverageResponseTime() + 'ms',
            reliabilityScore: this.getReliabilityScore().toFixed(2),
            quotaExceeded: this.quotaExceeded,
            lastError: this.lastError,
            lastErrorTime: this.lastErrorTime
        };
    }
}

class ProviderReliabilityManager {
    constructor() {
        this.metrics = new Map();
        this.failedAttempts = new Map(); // Track recent failures for backoff
        this.blacklistDuration = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Record successful API call
     */
    recordSuccess(provider, responseTimeMs) {
        if (!this.metrics.has(provider)) {
            this.metrics.set(provider, new ProviderMetrics(provider));
        }

        const metrics = this.metrics.get(provider);
        metrics.addSuccess(responseTimeMs);
        
        // Clear recent failures on success
        this.failedAttempts.delete(provider);

        console.log(`[ProviderReliability] ${provider} success - Score: ${metrics.getReliabilityScore().toFixed(2)}`);
    }

    /**
     * Record failed API call
     */
    recordFailure(provider, error, isQuotaError = false) {
        if (!this.metrics.has(provider)) {
            this.metrics.set(provider, new ProviderMetrics(provider));
        }

        const metrics = this.metrics.get(provider);
        metrics.addFailure(error);

        if (isQuotaError) {
            metrics.quotaExceeded = true;
        }

        // Track failure for backoff
        if (!this.failedAttempts.has(provider)) {
            this.failedAttempts.set(provider, { count: 0, firstFailureTime: Date.now() });
        }
        this.failedAttempts.get(provider).count++;

        console.log(`[ProviderReliability] ${provider} failure - ${error.message || error}`);
    }

    /**
     * Get sorted list of providers by reliability
     */
    getProvidersByReliability(providers) {
        return providers
            .map(p => ({
                id: p,
                score: (this.metrics.get(p) || new ProviderMetrics(p)).getReliabilityScore(),
                isBlacklisted: this.isBlacklisted(p)
            }))
            .filter(p => !p.isBlacklisted) // Filter out blacklisted
            .sort((a, b) => b.score - a.score) // Sort by score descending
            .map(p => p.id);
    }

    /**
     * Check if provider is blacklisted
     */
    isBlacklisted(provider) {
        const failures = this.failedAttempts.get(provider);
        if (!failures) return false;

        // Blacklist if >3 failures within last 5 minutes
        if (failures.count > 3) {
            const timeSinceFirstFailure = Date.now() - failures.firstFailureTime;
            return timeSinceFirstFailure < this.blacklistDuration;
        }

        return false;
    }

    /**
     * Get recommended provider for next attempt
     */
    getRecommendedProvider(availableProviders) {
        const sorted = this.getProvidersByReliability(availableProviders);
        
        if (sorted.length === 0) {
            console.warn('[ProviderReliability] No available providers! Using fallback.');
            return availableProviders[0]; // Fallback to first provider
        }

        return sorted[0];
    }

    /**
     * Get all metrics
     */
    getAllMetrics() {
        const all = {};
        for (const [provider, metrics] of this.metrics.entries()) {
            all[provider] = metrics.getStatus();
        }
        return all;
    }

    /**
     * Get ranked providers
     */
    getRankedProviders(providers) {
        return this.getProvidersByReliability(providers)
            .map(p => ({
                provider: p,
                ...this.metrics.get(p)?.getStatus()
            }));
    }

    /**
     * Reset metrics for a provider
     */
    resetMetrics(provider) {
        this.metrics.delete(provider);
        this.failedAttempts.delete(provider);
        console.log(`[ProviderReliability] Reset metrics for ${provider}`);
    }

    /**
     * Clear all metrics
     */
    clearAllMetrics() {
        this.metrics.clear();
        this.failedAttempts.clear();
        console.log('[ProviderReliability] Cleared all metrics');
    }

    /**
     * Get provider health summary
     */
    getHealthSummary() {
        const metrics = this.getAllMetrics();
        const healthy = Object.values(metrics).filter(m => m.successRate > 90).length;
        const unhealthy = Object.values(metrics).filter(m => m.successRate < 50).length;

        return {
            totalProviders: this.metrics.size,
            healthyProviders: healthy,
            unhealthyProviders: unhealthy,
            metricsSnapshot: metrics
        };
    }

    /**
     * Suggest provider improvements
     */
    suggestImprovements() {
        const suggestions = [];
        const metrics = this.getAllMetrics();

        for (const [provider, stats] of Object.entries(metrics)) {
            if (stats.successRate < 80) {
                suggestions.push({
                    provider,
                    issue: 'Low success rate',
                    successRate: stats.successRate,
                    recommendation: `Consider using ${provider} as fallback only`
                });
            }

            if (parseInt(stats.averageResponseTime) > 3000) {
                suggestions.push({
                    provider,
                    issue: 'Slow response time',
                    avgTime: stats.averageResponseTime,
                    recommendation: `${provider} is slow, use for non-urgent requests`
                });
            }

            if (stats.quotaExceeded) {
                suggestions.push({
                    provider,
                    issue: 'Quota exceeded',
                    recommendation: `Rotate keys or wait for quota reset for ${provider}`
                });
            }
        }

        return suggestions;
    }
}

// Singleton instance
const providerReliabilityManager = new ProviderReliabilityManager();

module.exports = {
    ProviderMetrics,
    ProviderReliabilityManager,
    providerReliabilityManager
};
