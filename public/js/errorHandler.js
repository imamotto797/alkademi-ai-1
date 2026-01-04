/**
 * Error Handler - Unified error management with user-friendly messages
 */
class ErrorHandler {
    constructor() {
        this.errorMessages = {
            'NETWORK_ERROR': {
                title: '🌐 Connection Error',
                message: 'Unable to connect to the server. Please check your internet connection.',
                recovery: 'Try again or contact support.'
            },
            'API_TIMEOUT': {
                title: '⏱️ Request Timeout',
                message: 'The request took too long. The server might be busy.',
                recovery: 'Please try again in a moment.'
            },
            'QUOTA_EXCEEDED': {
                title: '📊 Quota Limit Reached',
                message: 'You have reached the API quota limit for this provider.',
                recovery: 'Try a different provider or wait for quota reset.'
            },
            'INVALID_FILE': {
                title: '📄 Invalid File',
                message: 'The uploaded file is not supported or is corrupted.',
                recovery: 'Please upload a valid PDF, DOCX, or TXT file.'
            },
            'FILE_TOO_LARGE': {
                title: '📦 File Too Large',
                message: 'The file size exceeds the maximum limit.',
                recovery: 'Please upload a file smaller than 50MB.'
            },
            'EMPTY_CONTENT': {
                title: '⚠️ Empty Content',
                message: 'The uploaded file appears to be empty.',
                recovery: 'Please ensure the file contains valid content.'
            },
            'GENERATION_FAILED': {
                title: '❌ Generation Failed',
                message: 'Failed to generate content. Please try again.',
                recovery: 'If the problem persists, try a different provider.'
            },
            'DATABASE_ERROR': {
                title: '💾 Database Error',
                message: 'A database error occurred while processing your request.',
                recovery: 'Please try again later or contact support.'
            },
            'UNAUTHORIZED': {
                title: '🔐 Authorization Error',
                message: 'You do not have permission to access this resource.',
                recovery: 'Please check your credentials and try again.'
            },
            'NOT_FOUND': {
                title: '🔍 Not Found',
                message: 'The requested resource could not be found.',
                recovery: 'Please refresh and try again.'
            }
        };
    }

    /**
     * Show error notification
     * @param {string|Error} error - Error object or error code
     * @param {string} fallbackMessage - Fallback message if error code not found
     */
    showError(error, fallbackMessage = 'An unexpected error occurred') {
        let errorCode = 'UNKNOWN_ERROR';
        let details = '';

        if (error instanceof Error) {
            details = error.message;
            // Try to determine error code from error message
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorCode = 'NETWORK_ERROR';
            } else if (error.message.includes('timeout')) {
                errorCode = 'API_TIMEOUT';
            } else if (error.message.includes('quota')) {
                errorCode = 'QUOTA_EXCEEDED';
            }
        } else if (typeof error === 'string') {
            errorCode = error;
        }

        const errorInfo = this.errorMessages[errorCode] || {
            title: '❌ Error',
            message: fallbackMessage,
            recovery: 'Please try again or contact support.'
        };

        const notification = this.createErrorNotification(errorInfo, details);
        this.displayNotification(notification, 'error');

        console.error(`[ErrorHandler] ${errorCode}:`, error);
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {string} title - Optional title
     */
    showSuccess(message, title = '✅ Success') {
        const notification = document.createElement('div');
        notification.className = 'alert alert-success';
        notification.innerHTML = `
            <div class="alert-message">
                <strong>${title}</strong><br>
                <small>${message}</small>
            </div>
            <button class="alert-close">&times;</button>
        `;
        this.displayNotification(notification, 'success');
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {string} title - Optional title
     */
    showWarning(message, title = '⚠️ Warning') {
        const notification = document.createElement('div');
        notification.className = 'alert alert-warning';
        notification.innerHTML = `
            <div class="alert-message">
                <strong>${title}</strong><br>
                <small>${message}</small>
            </div>
            <button class="alert-close">&times;</button>
        `;
        this.displayNotification(notification, 'warning');
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {string} title - Optional title
     */
    showInfo(message, title = 'ℹ️ Info') {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info';
        notification.innerHTML = `
            <div class="alert-message">
                <strong>${title}</strong><br>
                <small>${message}</small>
            </div>
            <button class="alert-close">&times;</button>
        `;
        this.displayNotification(notification, 'info');
    }

    /**
     * Create error notification element
     */
    createErrorNotification(errorInfo, details) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-error';
        
        let detailsHtml = '';
        if (details) {
            detailsHtml = `<small style="display: block; margin-top: 5px; opacity: 0.8;">Details: ${details}</small>`;
        }

        notification.innerHTML = `
            <div class="alert-message">
                <strong>${errorInfo.title}</strong><br>
                <small>${errorInfo.message}</small>
                ${detailsHtml}
                <small style="display: block; margin-top: 8px; font-weight: 500; color: #333;">💡 ${errorInfo.recovery}</small>
            </div>
            <button class="alert-close">&times;</button>
        `;
        return notification;
    }

    /**
     * Display notification in the container
     */
    displayNotification(notification, type) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        container.appendChild(notification);

        // Add close button functionality
        const closeBtn = notification.querySelector('.alert-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            });
        }

        // Auto-dismiss after 6 seconds
        const timeout = type === 'error' ? 8000 : 5000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, timeout);
    }
}

// Add slide-out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(400px);
        }
    }
`;
document.head.appendChild(style);

// Global instance
window.errorHandler = new ErrorHandler();
