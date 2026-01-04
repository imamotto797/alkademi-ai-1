/**
 * QueueService - Task queue for long-running operations
 * Handles: batch uploads, bulk generation, quota management
 */

const EventEmitter = require('events');

class Job {
    constructor(id, type, data, priority = 0) {
        this.id = id;
        this.type = type;
        this.data = data;
        this.priority = priority;
        this.status = 'pending'; // pending, processing, completed, failed
        this.createdAt = Date.now();
        this.startedAt = null;
        this.completedAt = null;
        this.result = null;
        this.error = null;
        this.progress = 0;
        this.retries = 0;
        this.maxRetries = 3;
    }

    start() {
        this.status = 'processing';
        this.startedAt = Date.now();
    }

    complete(result) {
        this.status = 'completed';
        this.completedAt = Date.now();
        this.result = result;
    }

    fail(error) {
        this.status = 'failed';
        this.completedAt = Date.now();
        this.error = error.message || error;
    }

    getDuration() {
        const end = this.completedAt || Date.now();
        const start = this.startedAt || this.createdAt;
        return Math.round((end - start) / 1000); // seconds
    }

    updateProgress(progress) {
        this.progress = Math.min(100, Math.max(0, progress));
    }
}

class QueueService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.queue = [];
        this.processing = new Set();
        this.completed = new Map();
        this.failed = new Map();
        
        this.options = {
            concurrency: options.concurrency || 3,
            retryDelay: options.retryDelay || 1000,
            jobTimeout: options.jobTimeout || 300000 // 5 minutes
        };

        this.stats = {
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            retriedJobs: 0
        };

        this.processors = new Map();
    }

    /**
     * Register a processor for a job type
     */
    registerProcessor(type, processor) {
        this.processors.set(type, processor);
        console.log(`[QueueService] Registered processor for ${type}`);
    }

    /**
     * Add job to queue
     */
    addJob(type, data, priority = 0) {
        const id = this.generateJobId();
        const job = new Job(id, type, data, priority);
        
        this.queue.push(job);
        this.queue.sort((a, b) => b.priority - a.priority); // Sort by priority descending
        
        this.stats.totalJobs++;
        this.emit('job-added', job);
        console.log(`[QueueService] Job added: ${id} (type: ${type}, priority: ${priority})`);
        
        this.processQueue();
        return id;
    }

    /**
     * Process queue
     */
    async processQueue() {
        while (this.processing.size < this.options.concurrency && this.queue.length > 0) {
            const job = this.queue.shift();
            await this.executeJob(job);
        }
    }

    /**
     * Execute job with retry logic
     */
    async executeJob(job) {
        this.processing.add(job.id);
        job.start();
        
        this.emit('job-started', job);
        console.log(`[QueueService] Processing job: ${job.id}`);

        try {
            const processor = this.processors.get(job.type);
            if (!processor) {
                throw new Error(`No processor registered for job type: ${job.type}`);
            }

            // Execute with timeout
            const result = await this.executeWithTimeout(
                processor(job, (progress) => {
                    job.updateProgress(progress);
                    this.emit('job-progress', job);
                }),
                this.options.jobTimeout
            );

            job.complete(result);
            this.completed.set(job.id, job);
            this.stats.completedJobs++;
            
            this.emit('job-completed', job);
            console.log(`[QueueService] Job completed: ${job.id} (duration: ${job.getDuration()}s)`);

        } catch (error) {
            if (job.retries < job.maxRetries) {
                job.retries++;
                this.stats.retriedJobs++;
                console.log(`[QueueService] Retrying job ${job.id} (attempt ${job.retries}/${job.maxRetries})`);
                
                // Re-queue with delay
                setTimeout(() => {
                    this.queue.unshift(job);
                    job.status = 'pending';
                    this.processQueue();
                }, this.options.retryDelay * job.retries);

            } else {
                job.fail(error);
                this.failed.set(job.id, job);
                this.stats.failedJobs++;
                
                this.emit('job-failed', job);
                console.error(`[QueueService] Job failed: ${job.id} - ${error.message}`);
            }
        }

        this.processing.delete(job.id);
        this.emit('job-finished', job);
        this.processQueue(); // Continue processing
    }

    /**
     * Execute with timeout
     */
    executeWithTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Job timeout')), timeout)
            )
        ]);
    }

    /**
     * Generate unique job ID
     */
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Get job status
     */
    getJobStatus(jobId) {
        // Check processing
        for (const job of this.queue) {
            if (job.id === jobId) return { status: job.status, progress: job.progress };
        }
        
        // Check completed
        const completed = this.completed.get(jobId);
        if (completed) return { status: 'completed', result: completed.result };
        
        // Check failed
        const failed = this.failed.get(jobId);
        if (failed) return { status: 'failed', error: failed.error };

        return null;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            pending: this.queue.length,
            processing: this.processing.size,
            completed: this.completed.size,
            failed: this.failed.size,
            averageJobTime: this.getAverageJobTime()
        };
    }

    /**
     * Calculate average job time
     */
    getAverageJobTime() {
        if (this.completed.size === 0) return 0;
        
        let total = 0;
        for (const job of this.completed.values()) {
            total += job.getDuration();
        }
        return Math.round(total / this.completed.size);
    }

    /**
     * Clear completed jobs
     */
    clearCompleted() {
        const size = this.completed.size;
        this.completed.clear();
        console.log(`[QueueService] Cleared ${size} completed jobs`);
        return size;
    }

    /**
     * Clear failed jobs
     */
    clearFailed() {
        const size = this.failed.size;
        this.failed.clear();
        console.log(`[QueueService] Cleared ${size} failed jobs`);
        return size;
    }

    /**
     * Get pending jobs
     */
    getPendingJobs() {
        return this.queue.map(job => ({
            id: job.id,
            type: job.type,
            priority: job.priority,
            createdAt: job.createdAt
        }));
    }

    /**
     * Get recent completed jobs
     */
    getRecentCompleted(limit = 10) {
        return Array.from(this.completed.values())
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, limit)
            .map(job => ({
                id: job.id,
                type: job.type,
                duration: job.getDuration(),
                completedAt: job.completedAt
            }));
    }

    /**
     * Get recent failed jobs
     */
    getRecentFailed(limit = 10) {
        return Array.from(this.failed.values())
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, limit)
            .map(job => ({
                id: job.id,
                type: job.type,
                error: job.error,
                completedAt: job.completedAt
            }));
    }
}

// Create global queue service
const queueService = new QueueService({
    concurrency: 3,
    retryDelay: 1000,
    jobTimeout: 300000
});

module.exports = { QueueService, Job, queueService };
