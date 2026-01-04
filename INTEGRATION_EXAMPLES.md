# Integration Examples - How to Use New Services

This guide shows practical examples of integrating the new services into your existing code.

---

## 1. USING THE CACHE SERVICE

### In LLMService.js - Caching Generated Materials

```javascript
const { materialCache, embeddingCache } = require('./CacheService');

async generateTeachingMaterials(sourceContent, options = {}, relevantContext = []) {
    const cacheKey = { content: sourceContent.substring(0, 50), options };
    
    // Check cache first
    const cached = materialCache.get(sourceContent.substring(0, 100), options);
    if (cached) {
        console.log('[LLMService] Using cached result');
        return cached;
    }
    
    // Generate new material
    const result = await this.generateContent(...);
    
    // Cache the result (2 hour TTL)
    materialCache.set(sourceContent.substring(0, 100), result);
    
    return result;
}

async generateEmbeddings(chunks) {
    const results = [];
    
    for (const chunk of chunks) {
        // Check embedding cache
        const cached = embeddingCache.get(chunk);
        if (cached) {
            results.push(cached);
            continue;
        }
        
        // Generate new embedding
        const embedding = await this.createEmbedding(chunk);
        embeddingCache.set(chunk, embedding);
        results.push(embedding);
    }
    
    return results;
}
```

---

## 2. USING THE QUEUE SERVICE

### In materialRoutes.js - Batch Upload Handling

```javascript
const { queueService } = require('../services/QueueService');
const multer = require('multer');

// Register the upload processor once during app initialization
function registerQueueProcessors() {
    queueService.registerProcessor('bulk_upload', async (job, updateProgress) => {
        const { files } = job.data;
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            try {
                const result = await uploadFile(files[i]);
                results.push(result);
                updateProgress(((i + 1) / files.length) * 100);
            } catch (error) {
                console.error(`Error uploading file ${i}:`, error);
            }
        }
        
        return { uploaded: results };
    });
    
    queueService.registerProcessor('generate_materials', async (job, updateProgress) => {
        const { materialId, options } = job.data;
        
        updateProgress(10);
        const material = await getMaterial(materialId);
        
        updateProgress(40);
        const generated = await llmService.generateTeachingMaterials(material.content, options);
        
        updateProgress(70);
        await saveMaterial(materialId, generated);
        
        updateProgress(100);
        return { success: true, materialId };
    });
}

// Use in route
router.post('/upload-batch', async (req, res) => {
    try {
        const files = req.files;
        
        // Queue the batch upload job
        const jobId = queueService.addJob('bulk_upload', { files }, priority=10);
        
        res.json({
            jobId,
            message: 'Batch upload queued',
            checkStatusUrl: `/api/materials/job/${jobId}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check job status
router.get('/job/:jobId', (req, res) => {
    const status = queueService.getJobStatus(req.params.jobId);
    res.json(status || { error: 'Job not found' });
});

// Get queue statistics
router.get('/queue/stats', (req, res) => {
    res.json(queueService.getStats());
});
```

---

## 3. USING PROVIDER RELIABILITY MANAGER

### In AIProviderManager.js - Smart Fallback

```javascript
const { providerReliabilityManager } = require('./ProviderReliabilityManager');

class AIProviderManager {
    async callProvider(providerName, prompt, model) {
        const startTime = Date.now();
        
        try {
            const result = await this.executeProviderCall(providerName, prompt, model);
            const duration = Date.now() - startTime;
            
            // Record success
            providerReliabilityManager.recordSuccess(providerName, duration);
            
            return result;
            
        } catch (error) {
            const isQuotaError = error.message.includes('quota');
            providerReliabilityManager.recordFailure(providerName, error, isQuotaError);
            
            // Try next best provider
            const nextProvider = providerReliabilityManager.getRecommendedProvider(
                this.getAvailableProviders()
            );
            
            if (nextProvider !== providerName) {
                console.log(`Falling back from ${providerName} to ${nextProvider}`);
                return this.callProvider(nextProvider, prompt, model);
            }
            
            throw error;
        }
    }
    
    getProviderScores() {
        return providerReliabilityManager.getRankedProviders(
            this.getAvailableProviders()
        );
    }
}

// Listen to provider reliability improvements
providerReliabilityManager.on('health-check', (summary) => {
    console.log('[AIProvider] Health Check:', summary);
});
```

---

## 4. USING ENHANCED ANALYTICS SERVICE

### In analyticsRoutes.js - Analytics Endpoints

```javascript
const { analyticsService } = require('../services/EnhancedAnalyticsService');

// Record generation (in LLMService.js after generating content)
async generateAndTrack(provider, content, options) {
    const startTime = Date.now();
    const result = await this.generate(provider, content);
    
    // Record analytics
    analyticsService.recordGeneration(
        provider,
        options.model,
        Date.now() - startTime,
        result.tokensUsed || 0,
        true
    );
    
    return result;
}

// Analytics endpoints
router.get('/stats/generation', (req, res) => {
    const provider = req.query.provider;
    const timeRange = req.query.timeRange || 3600000; // 1 hour default
    
    res.json(analyticsService.getGenerationStats(provider, timeRange));
});

router.get('/stats/providers', (req, res) => {
    res.json(analyticsService.getProviderComparison());
});

router.get('/stats/behavior', (req, res) => {
    res.json(analyticsService.getUserBehavior());
});

router.get('/stats/costs', (req, res) => {
    res.json(analyticsService.getCostEstimate());
});

router.get('/dashboard', (req, res) => {
    res.json(analyticsService.getDashboardData());
});

router.get('/export', (req, res) => {
    const format = req.query.format || 'json';
    const data = analyticsService.exportData(format);
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="analytics.${format}"`);
    res.send(data);
});
```

---

## 5. USING VALIDATION MIDDLEWARE

### In app.js - Add Global Validation

```javascript
const { validationMiddleware } = require('./middleware/ValidationMiddleware');
const express = require('express');

const app = express();

// Add validation middleware
app.use(validationMiddleware.sizeCheckMiddleware); // Check request body size
app.use(validationMiddleware.rateLimitMiddleware.bind(validationMiddleware)); // Rate limiting

app.post('/api/materials/upload', (req, res) => {
    // Validate file
    const validation = validationMiddleware.validateFile(req.files.document);
    if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
    }
    
    // Validate content
    const contentValidation = validationMiddleware.validateContent(req.body.description);
    if (!contentValidation.valid) {
        return res.status(400).json({ errors: contentValidation.errors });
    }
    
    // Process upload...
});

app.post('/api/materials/generate', (req, res) => {
    // Validate generation parameters
    const validation = validationMiddleware.validateGenerationParams(req.body);
    if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
    }
    
    // Generate materials...
});
```

---

## 6. USING FRONTEND UTILITIES

### In upload.js Module - Error Handling & Progress

```javascript
class UploadModule {
    async uploadFile(file) {
        try {
            // Show loading state
            SkeletonLoader.showLoading(this.container, 'Uploading and analyzing...');
            
            // Validate
            if (file.size > 50 * 1024 * 1024) {
                errorHandler.showError('FILE_TOO_LARGE');
                return;
            }
            
            // Show progress
            const { container: progressDiv, update } = SkeletonLoader.createUploadProgress(file.name);
            this.container.appendChild(progressDiv);
            
            // Upload with progress tracking
            const formData = new FormData();
            formData.append('file', file);
            
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
                update((e.loaded / e.total) * 100);
            });
            
            xhr.addEventListener('load', () => {
                progressDiv.remove();
                errorHandler.showSuccess('File uploaded successfully!');
            });
            
            xhr.addEventListener('error', () => {
                errorHandler.showError('NETWORK_ERROR');
            });
            
            xhr.open('POST', '/api/materials/upload');
            xhr.send(formData);
            
        } catch (error) {
            errorHandler.showError(error);
        }
    }
}
```

### In generate.js Module - Provider Selection

```javascript
class GenerateModule {
    displayProviderSelector() {
        const container = document.getElementById('aiProvider');
        
        // Create provider grid
        const grid = providerSelector.createProviderGrid('gemini', (selectedProvider) => {
            console.log('Selected provider:', selectedProvider);
            this.selectedProvider = selectedProvider;
        });
        
        container.appendChild(grid);
        
        // Show provider comparison table
        const table = providerSelector.createProviderComparison();
        container.appendChild(table);
    }
    
    async generateMaterials() {
        try {
            // Show progress indicator
            const progress = new ProgressIndicator('progressContainer', 
                ['Upload', 'Analyze', 'Generate', 'View']);
            progress.nextStep();
            
            // Show loading skeleton
            SkeletonLoader.showSkeletonLoading(this.outputContainer, 'generation');
            
            const result = await api.generateMaterials({
                provider: this.selectedProvider,
                type: this.generationType,
                options: this.getOptions()
            });
            
            progress.nextStep();
            progress.nextStep();
            
            // Display result
            this.displayResult(result);
            
            errorHandler.showSuccess('Materials generated successfully!');
            progress.nextStep();
            
        } catch (error) {
            errorHandler.showError(error);
        }
    }
}
```

---

## 7. USING THEME MANAGER

### In Custom Modules - Theme-Aware Styling

```javascript
class CustomModule {
    renderWithTheme() {
        const currentTheme = window.themeManager?.getCurrentTheme() || 'light';
        
        // Use CSS variables automatically (no JavaScript needed)
        const element = document.createElement('div');
        element.style.background = 'var(--bg-secondary)';
        element.style.color = 'var(--text-primary)';
        element.style.border = `1px solid var(--border-color)`;
    }
}
```

---

## 8. DATABASE SOFT DELETES

### In Material Model - Soft Delete Operations

```javascript
class MaterialModel {
    // Create
    async create(data) {
        return pool.query(
            'INSERT INTO materials (title, content, source_type) VALUES ($1, $2, $3) RETURNING *',
            [data.title, data.content, data.source_type]
        );
    }
    
    // Soft delete
    async delete(materialId) {
        return pool.query(
            'UPDATE materials SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
            [materialId]
        );
    }
    
    // Restore from soft delete
    async restore(materialId) {
        return pool.query(
            'UPDATE materials SET is_deleted = FALSE, deleted_at = NULL WHERE id = $1',
            [materialId]
        );
    }
    
    // Get only non-deleted materials (default)
    async getAll() {
        return pool.query('SELECT * FROM materials WHERE is_deleted = FALSE ORDER BY created_at DESC');
    }
    
    // Get all including deleted (admin only)
    async getAllIncludingDeleted() {
        return pool.query('SELECT * FROM materials ORDER BY created_at DESC');
    }
    
    // Archive old deleted materials
    async archiveDeleted(daysOld = 30) {
        return pool.query(`
            INSERT INTO materials_archive (material_id, title, content, archived_at, original_created_at)
            SELECT id, title, content, CURRENT_TIMESTAMP, created_at
            FROM materials
            WHERE is_deleted = TRUE AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
            RETURNING *
        `);
    }
}
```

---

## 📋 INTEGRATION CHECKLIST

- [ ] Import CacheService in LLMService.js
- [ ] Register queue processors in app.js startup
- [ ] Add ProviderReliabilityManager to AIProviderManager
- [ ] Record events in EnhancedAnalyticsService
- [ ] Add validation middleware to routes
- [ ] Update frontend modules to use utilities
- [ ] Test cache hit rates
- [ ] Test queue processing
- [ ] Test provider fallback
- [ ] View analytics dashboard
- [ ] Verify dark mode works
- [ ] Test error messages
- [ ] Monitor database indexes

---

Generated: January 4, 2026
