/**
 * Utils.js - Shared utility functions
 * Common helpers for DOM manipulation, notifications, formatting, etc.
 */

class Notification {
    static show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notificationContainer') || this.createContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        container.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        if (duration > 0) {
            setTimeout(() => notification.remove(), duration);
        }
        
        return notification;
    }

    static createContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    static success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    static error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    static warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    static info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

class DOM {
    static getElementById(id) {
        return document.getElementById(id);
    }

    static querySelector(selector) {
        return document.querySelector(selector);
    }

    static create(tag, className = '', html = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (html) el.innerHTML = html;
        return el;
    }

    static clear(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    static show(element) {
        if (element) element.style.display = '';
    }

    static hide(element) {
        if (element) element.style.display = 'none';
    }

    static toggle(element) {
        if (element) {
            element.style.display = element.style.display === 'none' ? '' : 'none';
        }
    }

    static addClass(element, className) {
        if (element) element.classList.add(className);
    }

    static removeClass(element, className) {
        if (element) element.classList.remove(className);
    }

    static hasClass(element, className) {
        return element ? element.classList.contains(className) : false;
    }

    static on(element, event, handler) {
        if (element) element.addEventListener(event, handler);
    }

    static off(element, event, handler) {
        if (element) element.removeEventListener(event, handler);
    }
}

class DateFormatter {
    static format(date, format = 'short') {
        if (typeof date === 'string') {
            date = new Date(date);
        }

        const options = format === 'short'
            ? { month: 'short', day: 'numeric', year: 'numeric' }
            : { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };

        return new Intl.DateTimeFormat('en-US', options).format(date);
    }

    static relative(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }

        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 30) return `${days}d ago`;
        
        return this.format(date, 'short');
    }
}

class DataFormatter {
    static bytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    static percentage(value, total) {
        if (total === 0) return '0%';
        return Math.round((value / total) * 100) + '%';
    }

    static rating(stars) {
        return '★'.repeat(Math.round(stars)) + '☆'.repeat(5 - Math.round(stars));
    }

    static truncate(text, length = 100) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
}

class Storage {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage error:', e);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    static clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.error('Storage error:', e);
        }
    }
}

// Export for use in modules
const utils = {
    Notification,
    DOM,
    DateFormatter,
    DataFormatter,
    Storage,
};
