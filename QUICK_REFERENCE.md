# Quick Reference Guide - New Services & Utilities

## 📦 NEW FILES CREATED

### Frontend (Client-Side)
```
public/css/dark-mode.css              ✅ Dark/light theme styles
public/js/themeManager.js             ✅ Theme toggle manager
public/js/errorHandler.js             ✅ Error notification system
public/js/skeletonLoader.js           ✅ Loading skeleton components
public/js/providerSelector.js         ✅ AI provider selection UI
public/js/progressIndicator.js        ✅ Step-based progress tracking
```

### Backend (Server-Side)
```
src/services/CacheService.js          ✅ In-memory caching
src/services/QueueService.js          ✅ Job queue management
src/services/ProviderReliabilityManager.js  ✅ Provider performance tracking
src/services/EnhancedAnalyticsService.js    ✅ Analytics & metrics
src/middleware/ValidationMiddleware.js ✅ Input validation & rate limiting
```

---

## 🚀 QUICK START EXAMPLES

### Dark Mode (Frontend)
```html
<!-- Already included in index.html -->
<!-- Theme toggle appears in header automatically -->
<!-- CSS variables used: var(--bg-primary), var(--text-primary), etc -->
```

### Error Handling (Frontend)
```javascript
// Show error
errorHandler.showError('QUOTA_EXCEEDED');

// Show success
errorHandler.showSuccess('Generated successfully!');

// Show warning
errorHandler.showWarning('API quota running low');

// Custom error
errorHandler.showError(new Error('Custom error message'));
```

### Skeleton Loaders (Frontend)
```javascript
// Show loading skeleton
SkeletonLoader.showSkeletonLoading(element, 'generation');

// Show spinner
SkeletonLoader.showLoading(element, 'Processing...');

// Upload progress
const progress = SkeletonLoader.createUploadProgress('file.pdf');
progress.update(50); // 50% complete
```

### Provider Selection (Frontend)
```javascript
// Create provider grid
const grid = providerSelector.createProviderGrid('gemini');
container.appendChild(grid);

// Compare providers
const table = providerSelector.createProviderComparison();

// Get recommendation
const recommended = providerSelector.recommendProvider('educational');
```

### Progress Indicator (Frontend)
```javascript
const progress = new ProgressIndicator('containerId', 
    ['Step 1', 'Step 2', 'Step 3', 'Step 4']);

progress.nextStep();      // Move to next
progress.goToStep(2);     // Jump to step
progress.reset();         // Reset progress
```

### Caching (Backend)
```javascript
const { materialCache, embeddingCache } = require('./CacheService');

// Material caching
materialCache.set(id, content);
const cached = materialCache.get(id);

// Embedding caching
embeddingCache.set(text, embedding);
const embedding = embeddingCache.get(text);

// Check cache stats
const stats = cacheService.getStats();
// { hits, misses, hitRate, size, memorySizeEstimate }
```

### Queue Service (Backend)
```javascript
const { queueService } = require('./QueueService');

// Register processor
queueService.registerProcessor('upload', async (job, updateProgress) => {
    // Process job
    updateProgress(50); // Report progress
    return result;
});

// Add job
const jobId = queueService.addJob('upload', data, priority=10);

// Check status
const status = queueService.getJobStatus(jobId);
// { status: 'processing|completed|failed', progress, result/error }
```

### Provider Reliability (Backend)
```javascript
const { providerReliabilityManager } = require('./ProviderReliabilityManager');

// Record success
providerReliabilityManager.recordSuccess('gemini', responseTimeMs);

// Record failure
providerReliabilityManager.recordFailure('gemini', error, isQuotaError);

// Get best provider
const best = providerReliabilityManager.getRecommendedProvider(providers);

// Get ranked providers
const ranked = providerReliabilityManager.getRankedProviders(providers);

// Health check
const health = providerReliabilityManager.getHealthSummary();
```

### Analytics (Backend)
```javascript
const { analyticsService } = require('./EnhancedAnalyticsService');

// Record generation
analyticsService.recordGeneration(provider, model, duration, tokensUsed, success);

// Record API call
analyticsService.recordAPICall(provider, endpoint, duration, statusCode);

// Get statistics
const genStats = analyticsService.getGenerationStats();
const costEstimate = analyticsService.getCostEstimate();
const dashboard = analyticsService.getDashboardData();
```

### Validation (Backend)
```javascript
const { validationMiddleware } = require('./middleware/ValidationMiddleware');

// Validate file
const fileValidation = validationMiddleware.validateFile(file);
if (!fileValidation.valid) {
    // Handle errors
}

// Validate content
const contentValidation = validationMiddleware.validateContent(text);

// Validate generation params
const paramValidation = validationMiddleware.validateGenerationParams(params);

// Use middleware in app
app.use(validationMiddleware.rateLimitMiddleware.bind(validationMiddleware));
```

---

## 📊 API ENDPOINTS (Analytics)

```
GET  /api/analytics/stats/generation  - Generation statistics
GET  /api/analytics/stats/providers    - Provider comparison
GET  /api/analytics/stats/behavior     - User behavior analytics
GET  /api/analytics/stats/costs        - Cost estimation
GET  /api/analytics/dashboard          - Complete dashboard
GET  /api/analytics/export?format=csv  - Export data
```

---

## 🎨 CSS THEME VARIABLES

```css
--bg-primary          /* Main background */
--bg-secondary        /* Secondary background (cards) */
--text-primary        /* Primary text */
--text-secondary      /* Secondary text */
--border-color        /* Borders */
--shadow              /* Box shadows */
--accent              /* Primary accent color */
--accent-dark         /* Darker accent */
--success             /* Success color */
--warning             /* Warning color */
--danger              /* Danger/error color */
--info                /* Info color */
```

---

## 📈 PERFORMANCE METRICS

### Cache Service
- Hit rate: Track with `cacheService.getStats()`
- Memory usage: Auto-tracked
- Cleanup: Automatic every 5 minutes

### Queue Service
- Concurrency: 3 jobs simultaneously
- Timeout: 5 minutes per job
- Retries: 3 attempts with exponential backoff

### Provider Reliability
- Reliability Score: 0-100 (50% success rate + 50% speed)
- Blacklist Duration: 5 minutes (3+ failures)
- Tracked: Success rate, response time, quota status

### Analytics
- Event Storage: Last 10,000 events
- Cleanup: Configurable retention period
- Export: JSON or CSV format

---

## 🔍 DEBUGGING TIPS

### Check Cache Performance
```javascript
const stats = cacheService.getStats();
console.log(`Hit Rate: ${stats.hitRate}, Size: ${stats.memorySizeEstimate}`);
```

### Monitor Queue Status
```javascript
const stats = queueService.getStats();
console.log(`Pending: ${stats.pending}, Processing: ${stats.processing}`);
```

### View Provider Rankings
```javascript
const ranked = providerReliabilityManager.getRankedProviders(['gemini', 'openai']);
ranked.forEach(p => {
    console.log(`${p.provider}: Score=${p.reliabilityScore}, SuccessRate=${p.successRate}`);
});
```

### Check Analytics
```javascript
const dashboard = analyticsService.getDashboardData();
console.log(JSON.stringify(dashboard, null, 2));
```

---

## ⚡ PERFORMANCE TIPS

1. **Caching**: Enable caching for frequently accessed content
2. **Queuing**: Use queue for bulk operations to prevent overload
3. **Validation**: Fail fast with input validation
4. **Monitoring**: Check provider reliability scores regularly
5. **Analytics**: Review cost estimates to optimize provider usage
6. **Database**: Use indexed queries for analytics tables

---

## 🔐 SECURITY FEATURES

✅ Rate limiting: 30 requests/minute per IP
✅ File validation: Size & type checking
✅ Content validation: Spam & injection prevention
✅ Input sanitization: XSS prevention
✅ Soft deletes: Data recovery support
✅ Error handling: No sensitive info in responses

---

## 📝 CONFIGURATION

### Queue Service
```javascript
new QueueService({
    concurrency: 3,        // Parallel jobs
    retryDelay: 1000,      // Milliseconds
    jobTimeout: 300000     // 5 minutes
});
```

### Cache Service
```javascript
// Material Cache: 2 hours TTL
// Embedding Cache: 4 hours TTL
// API Response Cache: 30 minutes TTL
// Customize by adjusting TTL in CacheService.js
```

### Validation
```javascript
MAX_FILE_SIZE = 50 * 1024 * 1024  // 50MB
MAX_REQUEST_BODY = 10 * 1024 * 1024  // 10MB
RATE_LIMIT_MAX_REQUESTS = 30  // per minute
```

---

## 🎓 TUTORIALS

### Tutorial 1: Add Caching to Material Generation
1. Import: `const { materialCache } = require('./CacheService');`
2. Check cache: `const cached = materialCache.get(id);`
3. Use cached value if available
4. Cache new value: `materialCache.set(id, result);`

### Tutorial 2: Setup Batch Upload Queue
1. Register processor in app.js startup
2. Create upload handler function
3. Call `queueService.addJob('bulk_upload', data)`
4. Check job status with `queueService.getJobStatus(jobId)`

### Tutorial 3: Implement Provider Fallback
1. Track calls with `recordSuccess()` / `recordFailure()`
2. Get recommended provider: `getRecommendedProvider()`
3. Catch errors and retry with fallback provider
4. Monitor health: `getHealthSummary()`

---

## 📞 SUPPORT

For issues or questions:
1. Check integration examples in `INTEGRATION_EXAMPLES.md`
2. Review implementation details in `IMPROVEMENTS_IMPLEMENTATION.md`
3. Check inline code comments in service files
4. Review error messages from `errorHandler`

---

Generated: January 4, 2026
Last Updated: v1.0
