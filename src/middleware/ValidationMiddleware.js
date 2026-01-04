/**
 * ValidationMiddleware - Enhanced input validation and security checks
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_REQUEST_BODY = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
];

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

class ValidationMiddleware {
    constructor() {
        this.requestCounts = new Map();
        this.blockedIPs = new Set();
    }

    /**
     * Validate file upload
     */
    validateFile(file) {
        const errors = [];

        if (!file) {
            errors.push('No file provided');
            return { valid: false, errors };
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        // Check MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            errors.push(`File type ${file.mimetype} is not supported. Allowed types: PDF, DOCX, TXT, MD`);
        }

        // Check for empty file
        if (file.size === 0) {
            errors.push('File is empty');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate text content
     */
    validateContent(content, minLength = 50, maxLength = 1000000) {
        const errors = [];

        if (!content || typeof content !== 'string') {
            errors.push('Content must be a non-empty string');
            return { valid: false, errors };
        }

        const trimmed = content.trim();
        
        if (trimmed.length < minLength) {
            errors.push(`Content must be at least ${minLength} characters`);
        }

        if (trimmed.length > maxLength) {
            errors.push(`Content exceeds maximum length of ${maxLength} characters`);
        }

        // Check for spam patterns
        const spamPatterns = [
            /viagra|cialis|casino|lottery|prize/gi,
            /\{\{.*\}\}/g, // Template injection
            /eval\(|exec\(|system\(/g, // Code injection
        ];

        for (const pattern of spamPatterns) {
            if (pattern.test(content)) {
                errors.push('Content contains suspicious patterns');
                break;
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate generation parameters
     */
    validateGenerationParams(params) {
        const errors = [];

        const validStyles = ['formal', 'casual', 'storytelling', 'academic'];
        const validLevels = ['sd', 'smp', 'sma', 'undergraduate', 'graduate', 'professional'];
        const validTypes = ['learning_materials', 'learning_planner', 'questions', 'quiz'];

        if (params.style && !validStyles.includes(params.style)) {
            errors.push(`Invalid style. Allowed: ${validStyles.join(', ')}`);
        }

        if (params.educationLevel && !validLevels.includes(params.educationLevel)) {
            errors.push(`Invalid education level. Allowed: ${validLevels.join(', ')}`);
        }

        if (params.generationType && !validTypes.includes(params.generationType)) {
            errors.push(`Invalid generation type. Allowed: ${validTypes.join(', ')}`);
        }

        if (params.focusAreas && !Array.isArray(params.focusAreas)) {
            errors.push('focusAreas must be an array');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Rate limiting middleware
     */
    rateLimitMiddleware(req, res, next) {
        const ip = req.ip || req.connection.remoteAddress;

        // Check if IP is blocked
        if (this.blockedIPs.has(ip)) {
            return res.status(429).json({ error: 'IP address is temporarily blocked' });
        }

        const now = Date.now();
        const windowKey = `${ip}_${Math.floor(now / RATE_LIMIT_WINDOW)}`;

        if (!this.requestCounts.has(windowKey)) {
            this.requestCounts.set(windowKey, 0);
        }

        const count = this.requestCounts.get(windowKey);

        if (count >= RATE_LIMIT_MAX_REQUESTS) {
            // Block IP for 15 minutes
            this.blockedIPs.add(ip);
            setTimeout(() => this.blockedIPs.delete(ip), 15 * 60 * 1000);

            return res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: 15 * 60
            });
        }

        this.requestCounts.set(windowKey, count + 1);

        // Cleanup old windows
        if (Math.random() < 0.1) {
            for (const key of this.requestCounts.keys()) {
                const keyTime = parseInt(key.split('_')[1]) * RATE_LIMIT_WINDOW;
                if (now - keyTime > RATE_LIMIT_WINDOW * 10) {
                    this.requestCounts.delete(key);
                }
            }
        }

        res.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
        res.set('X-RateLimit-Remaining', RATE_LIMIT_MAX_REQUESTS - count - 1);
        next();
    }

    /**
     * Request body size limit middleware
     */
    sizeCheckMiddleware(req, res, next) {
        const contentLength = parseInt(req.headers['content-length'], 10);

        if (contentLength > MAX_REQUEST_BODY) {
            return res.status(413).json({
                error: `Request body exceeds maximum size of ${MAX_REQUEST_BODY / 1024 / 1024}MB`
            });
        }

        next();
    }

    /**
     * Sanitize input
     */
    sanitizeInput(input) {
        if (typeof input === 'string') {
            return input
                .trim()
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                .slice(0, 1000000); // Max length
        }

        if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[key] = this.sanitizeInput(value);
            }
            return sanitized;
        }

        return input;
    }

    /**
     * Validate API key
     */
    validateAPIKey(key) {
        if (!key || typeof key !== 'string') {
            return { valid: false, error: 'Invalid API key format' };
        }

        if (key.length < 10) {
            return { valid: false, error: 'API key too short' };
        }

        return { valid: true };
    }

    /**
     * Create validation middleware function
     */
    createValidationMiddleware(validator) {
        return (req, res, next) => {
            const result = validator(req);
            if (!result.valid) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: result.errors
                });
            }
            next();
        };
    }
}

// Create singleton instance
const validationMiddleware = new ValidationMiddleware();

// Export
module.exports = {
    ValidationMiddleware,
    validationMiddleware,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
    RATE_LIMIT_MAX_REQUESTS
};
