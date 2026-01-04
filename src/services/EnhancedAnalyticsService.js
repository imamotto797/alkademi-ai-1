/**
 * EnhancedAnalyticsService - Comprehensive analytics and performance tracking
 */

const { cacheService } = require('./CacheService');

class AnalyticsEvent {
    constructor(type, data = {}) {
        this.id = Date.now() + Math.random();
        this.type = type;
        this.timestamp = Date.now();
        this.data = data;
    }
}

class EnhancedAnalyticsService {
    constructor() {
        this.events = [];
        this.maxEvents = 10000; // Keep last 10k events
        this.metrics = new Map();
        this.sessionMetrics = new Map();
    }

    /**
     * Record an event
     */
    recordEvent(type, data = {}) {
        const event = new AnalyticsEvent(type, data);
        this.events.push(event);

        // Keep only recent events
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        this.updateMetrics(type, data);
        console.log(`[Analytics] Event recorded: ${type}`);

        return event;
    }

    /**
     * Update metrics based on event
     */
    updateMetrics(type, data) {
        if (!this.metrics.has(type)) {
            this.metrics.set(type, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                errors: 0
            });
        }

        const metric = this.metrics.get(type);
        metric.count++;

        if (data.duration) {
            metric.totalTime += data.duration;
            metric.minTime = Math.min(metric.minTime, data.duration);
            metric.maxTime = Math.max(metric.maxTime, data.duration);
        }

        if (data.error) {
            metric.errors++;
        }
    }

    /**
     * Record generation performance
     */
    recordGeneration(provider, model, duration, tokensUsed, success = true) {
        return this.recordEvent('generation', {
            provider,
            model,
            duration,
            tokensUsed,
            success,
            timestamp: Date.now()
        });
    }

    /**
     * Record API call
     */
    recordAPICall(provider, endpoint, duration, statusCode, success = true) {
        return this.recordEvent('api_call', {
            provider,
            endpoint,
            duration,
            statusCode,
            success,
            timestamp: Date.now()
        });
    }

    /**
     * Record material upload
     */
    recordUpload(fileSize, duration, success = true, error = null) {
        return this.recordEvent('upload', {
            fileSize,
            duration,
            success,
            error,
            timestamp: Date.now()
        });
    }

    /**
     * Get generation statistics
     */
    getGenerationStats(provider = null, timeRange = 3600000) { // Last 1 hour
        const now = Date.now();
        const startTime = now - timeRange;

        const generations = this.events.filter(e =>
            e.type === 'generation' &&
            e.timestamp >= startTime &&
            (!provider || e.data.provider === provider)
        );

        return {
            totalGenerations: generations.length,
            successfulGenerations: generations.filter(e => e.data.success).length,
            failedGenerations: generations.filter(e => !e.data.success).length,
            successRate: generations.length > 0 
                ? (generations.filter(e => e.data.success).length / generations.length * 100).toFixed(2) + '%'
                : 'N/A',
            averageDuration: generations.length > 0
                ? Math.round(generations.reduce((sum, e) => sum + (e.data.duration || 0), 0) / generations.length) + 'ms'
                : 0,
            totalTokensUsed: generations.reduce((sum, e) => sum + (e.data.tokensUsed || 0), 0),
            byProvider: this.groupGenerationsByProvider(generations)
        };
    }

    /**
     * Group generations by provider
     */
    groupGenerationsByProvider(generations) {
        const grouped = {};

        generations.forEach(gen => {
            const provider = gen.data.provider;
            if (!grouped[provider]) {
                grouped[provider] = {
                    count: 0,
                    successCount: 0,
                    averageDuration: 0,
                    totalTokens: 0
                };
            }

            grouped[provider].count++;
            if (gen.data.success) grouped[provider].successCount++;
            grouped[provider].totalTokens += gen.data.tokensUsed || 0;
        });

        // Calculate averages
        for (const provider in grouped) {
            const providerGens = generations.filter(g => g.data.provider === provider);
            grouped[provider].averageDuration = Math.round(
                providerGens.reduce((sum, g) => sum + (g.data.duration || 0), 0) / providerGens.length
            );
        }

        return grouped;
    }

    /**
     * Get provider comparison
     */
    getProviderComparison() {
        const providers = {};

        this.events.filter(e => e.type === 'generation').forEach(event => {
            const provider = event.data.provider;
            if (!providers[provider]) {
                providers[provider] = {
                    calls: 0,
                    successes: 0,
                    failures: 0,
                    totalTime: 0,
                    avgTime: 0,
                    successRate: 0,
                    costEstimate: 0
                };
            }

            providers[provider].calls++;
            if (event.data.success) {
                providers[provider].successes++;
            } else {
                providers[provider].failures++;
            }
            providers[provider].totalTime += event.data.duration || 0;
        });

        // Calculate derived metrics
        for (const provider in providers) {
            const p = providers[provider];
            p.avgTime = p.calls > 0 ? Math.round(p.totalTime / p.calls) : 0;
            p.successRate = p.calls > 0 ? ((p.successes / p.calls) * 100).toFixed(2) + '%' : 'N/A';
        }

        return providers;
    }

    /**
     * Get API statistics
     */
    getAPIStats(provider = null, timeRange = 3600000) {
        const now = Date.now();
        const startTime = now - timeRange;

        const apiCalls = this.events.filter(e =>
            e.type === 'api_call' &&
            e.timestamp >= startTime &&
            (!provider || e.data.provider === provider)
        );

        const byEndpoint = {};
        apiCalls.forEach(call => {
            const endpoint = call.data.endpoint;
            if (!byEndpoint[endpoint]) {
                byEndpoint[endpoint] = {
                    calls: 0,
                    avgDuration: 0,
                    errorRate: 0
                };
            }

            byEndpoint[endpoint].calls++;
        });

        return {
            totalCalls: apiCalls.length,
            successfulCalls: apiCalls.filter(c => c.data.success).length,
            failedCalls: apiCalls.filter(c => !c.data.success).length,
            averageDuration: apiCalls.length > 0
                ? Math.round(apiCalls.reduce((sum, c) => sum + c.data.duration, 0) / apiCalls.length) + 'ms'
                : 0,
            byEndpoint
        };
    }

    /**
     * Get user behavior analytics
     */
    getUserBehavior(timeRange = 86400000) { // Last 24 hours
        const now = Date.now();
        const startTime = now - timeRange;

        const relevantEvents = this.events.filter(e => e.timestamp >= startTime);

        return {
            totalEvents: relevantEvents.length,
            averageEventsPerHour: (relevantEvents.length / (timeRange / 3600000)).toFixed(2),
            eventBreakdown: this.breakdownEventTypes(relevantEvents),
            peakHours: this.findPeakHours(relevantEvents)
        };
    }

    /**
     * Breakdown event types
     */
    breakdownEventTypes(events) {
        const breakdown = {};

        events.forEach(event => {
            if (!breakdown[event.type]) {
                breakdown[event.type] = 0;
            }
            breakdown[event.type]++;
        });

        return breakdown;
    }

    /**
     * Find peak usage hours
     */
    findPeakHours(events) {
        const hourlyCount = {};

        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
        });

        return Object.entries(hourlyCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([hour, count]) => ({ hour: hour + ':00', count }));
    }

    /**
     * Get cost estimate
     */
    getCostEstimate(provider = null) {
        const costRates = {
            'gemini': { input: 0.075, output: 0.225 }, // per 1M tokens
            'openai': { input: 3, output: 6 }, // gpt-4 pricing
            'anthropic': { input: 3, output: 15 },
            'nvidia': { input: 0, output: 0 }, // Free
            'deepseek': { input: 0.14, output: 0.28 },
            'qwen': { input: 0.0008, output: 0.0008 }
        };

        const generations = this.events.filter(e => e.type === 'generation');

        if (provider) {
            const providerGens = generations.filter(g => g.data.provider === provider);
            const rate = costRates[provider] || { input: 0, output: 0 };
            const totalTokens = providerGens.reduce((sum, g) => sum + (g.data.tokensUsed || 0), 0);
            
            return {
                provider,
                estimatedCost: ((totalTokens / 1000000) * (rate.output || 0)).toFixed(4),
                currency: 'USD'
            };
        }

        // Calculate for all providers
        const costByProvider = {};
        for (const prov in costRates) {
            const provGens = generations.filter(g => g.data.provider === prov);
            const totalTokens = provGens.reduce((sum, g) => sum + (g.data.tokensUsed || 0), 0);
            costByProvider[prov] = ((totalTokens / 1000000) * (costRates[prov].output || 0)).toFixed(4);
        }

        const totalCost = Object.values(costByProvider).reduce((a, b) => parseFloat(a) + parseFloat(b), 0);

        return {
            totalCost: totalCost.toFixed(4),
            byProvider: costByProvider,
            currency: 'USD'
        };
    }

    /**
     * Get comprehensive dashboard data
     */
    getDashboardData() {
        return {
            generationStats: this.getGenerationStats(),
            apiStats: this.getAPIStats(),
            userBehavior: this.getUserBehavior(),
            providerComparison: this.getProviderComparison(),
            costEstimate: this.getCostEstimate(),
            timestamp: Date.now()
        };
    }

    /**
     * Export analytics data
     */
    exportData(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.getDashboardData(), null, 2);
        } else if (format === 'csv') {
            return this.eventsToCSV();
        }
        return null;
    }

    /**
     * Convert events to CSV
     */
    eventsToCSV() {
        const headers = ['Timestamp', 'Type', 'Provider', 'Duration', 'Success', 'Details'];
        const rows = this.events.map(e => [
            new Date(e.timestamp).toISOString(),
            e.type,
            e.data.provider || '-',
            e.data.duration || '-',
            e.data.success ? 'Yes' : 'No',
            JSON.stringify(e.data)
        ]);

        return [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');
    }

    /**
     * Clear old events
     */
    clearOldEvents(hoursToKeep = 24) {
        const cutoffTime = Date.now() - (hoursToKeep * 3600000);
        const initialCount = this.events.length;
        
        this.events = this.events.filter(e => e.timestamp >= cutoffTime);
        
        console.log(`[Analytics] Cleared ${initialCount - this.events.length} old events`);
    }
}

// Singleton instance
const analyticsService = new EnhancedAnalyticsService();

module.exports = {
    AnalyticsEvent,
    EnhancedAnalyticsService,
    analyticsService
};
