/**
 * CacheService - In-memory and Redis caching layer
 * Caches: generated materials, embeddings, API responses
 */

const crypto = require('crypto');

class CacheService {
    constructor(ttlMinutes = 60) {
        this.cache = new Map();
        this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        
        // Periodically cleanup expired entries
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Generate cache key from parameters
     */
    generateKey(type, params) {
        const key = `${type}:${JSON.stringify(params)}`;
        return crypto.createHash('md5').update(key).digest('hex');
    }

    /**
     * Set cache entry
     */
    set(type, params, value, ttlMinutes = null) {
        const key = this.generateKey(type, params);
        const now = Date.now();
        const expiryTime = now + (ttlMinutes ? ttlMinutes * 60 * 1000 : this.ttl);

        this.cache.set(key, {
            value,
            createdAt: now,
            expiresAt: expiryTime,
            hits: 0
        });

        console.log(`[CacheService] Cached ${type} with key ${key.substring(0, 8)}...`);
        return key;
    }

    /**
     * Get cache entry
     */
    get(type, params) {
        const key = this.generateKey(type, params);
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check expiration
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        entry.hits++;
        this.stats.hits++;
        console.log(`[CacheService] Cache HIT for ${key.substring(0, 8)}... (hits: ${entry.hits})`);
        return entry.value;
    }

    /**
     * Check if key exists in cache
     */
    has(type, params) {
        const key = this.generateKey(type, params);
        const entry = this.cache.get(key);
        return entry && Date.now() <= entry.expiresAt;
    }

    /**
     * Delete cache entry
     */
    delete(type, params) {
        const key = this.generateKey(type, params);
        return this.cache.delete(key);
    }

    /**
     * Clear specific type cache
     */
    clearType(type) {
        let count = 0;
        for (const [key] of this.cache.entries()) {
            if (key.startsWith(type + ':')) {
                this.cache.delete(key);
                count++;
            }
        }
        console.log(`[CacheService] Cleared ${count} entries of type ${type}`);
        return count;
    }

    /**
     * Clear all cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`[CacheService] Cleared entire cache (${size} entries)`);
        return size;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
            size: this.cache.size,
            memorySizeEstimate: this.estimateMemorySize()
        };
    }

    /**
     * Estimate memory usage
     */
    estimateMemorySize() {
        let bytes = 0;
        for (const [key, entry] of this.cache.entries()) {
            bytes += key.length;
            bytes += JSON.stringify(entry.value).length;
        }
        return this.formatBytes(bytes);
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let expired = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                expired++;
                this.stats.evictions++;
            }
        }

        if (expired > 0) {
            console.log(`[CacheService] Cleanup: Removed ${expired} expired entries`);
        }
    }

    /**
     * Get hot cache entries (most accessed)
     */
    getHotEntries(limit = 10) {
        const entries = Array.from(this.cache.entries())
            .map(([key, entry]) => ({
                key: key.substring(0, 16) + '...',
                hits: entry.hits,
                age: Math.round((Date.now() - entry.createdAt) / 1000) + 's'
            }))
            .sort((a, b) => b.hits - a.hits)
            .slice(0, limit);

        return entries;
    }

    /**
     * Invalidate cache by pattern
     */
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern);
        let count = 0;

        for (const [key] of this.cache.entries()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        console.log(`[CacheService] Invalidated ${count} entries matching pattern: ${pattern}`);
        return count;
    }
}

// Specific cache instances
class MaterialCache extends CacheService {
    constructor() {
        super(120); // 2 hours TTL for materials
    }

    set(materialId, content, metadata = {}) {
        return super.set('material', { id: materialId, ...metadata }, content, 120);
    }

    get(materialId, metadata = {}) {
        return super.get('material', { id: materialId, ...metadata });
    }

    has(materialId, metadata = {}) {
        return super.has('material', { id: materialId, ...metadata });
    }
}

class EmbeddingCache extends CacheService {
    constructor() {
        super(240); // 4 hours TTL for embeddings
    }

    set(text, embedding) {
        return super.set('embedding', { text: text.substring(0, 100) }, embedding, 240);
    }

    get(text) {
        return super.get('embedding', { text: text.substring(0, 100) });
    }

    has(text) {
        return super.has('embedding', { text: text.substring(0, 100) });
    }
}

class APIResponseCache extends CacheService {
    constructor() {
        super(30); // 30 minutes TTL for API responses
    }

    set(provider, endpoint, params, response) {
        return super.set('api', { provider, endpoint, params: JSON.stringify(params) }, response, 30);
    }

    get(provider, endpoint, params) {
        return super.get('api', { provider, endpoint, params: JSON.stringify(params) });
    }

    has(provider, endpoint, params) {
        return super.has('api', { provider, endpoint, params: JSON.stringify(params) });
    }
}

// Export instances
const cacheService = new CacheService();
const materialCache = new MaterialCache();
const embeddingCache = new EmbeddingCache();
const apiResponseCache = new APIResponseCache();

module.exports = {
    CacheService,
    MaterialCache,
    EmbeddingCache,
    APIResponseCache,
    cacheService,
    materialCache,
    embeddingCache,
    apiResponseCache
};
