/**
 * API.js - Centralized API communication module
 * Handles all HTTP requests to backend with consistent error handling and response parsing
 */

class APIManager {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers: { ...defaultHeaders, ...options.headers },
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Material endpoints
     */
    async uploadMaterials(formData) {
        const url = `${this.baseURL}/materials/upload`;
        return fetch(url, {
            method: 'POST',
            body: formData,
        }).then(res => {
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        });
    }

    async uploadCombinedMaterials(formData) {
        const url = `${this.baseURL}/materials/upload-combined`;
        return fetch(url, {
            method: 'POST',
            body: formData,
        }).then(res => {
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        });
    }

    async uploadMultipleMaterials(formData) {
        const url = `${this.baseURL}/materials/upload-multiple`;
        return fetch(url, {
            method: 'POST',
            body: formData,
        }).then(res => {
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        });
    }

    async getMaterials() {
        return this.request('/materials', { method: 'GET' });
    }

    async getMaterial(id) {
        return this.request(`/materials/${id}`, { method: 'GET' });
    }

    async updateMaterial(id, data) {
        return this.request(`/materials/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteMaterial(id) {
        return this.request(`/materials/${id}`, { method: 'DELETE' });
    }

    /**
     * Generation endpoints
     */
    async generateMaterials(materialId, options) {
        return this.request(`/materials/${materialId}/generate`, {
            method: 'POST',
            body: JSON.stringify(options),
        });
    }

    async regenerateMaterials(materialId, options) {
        return this.request(`/materials/${materialId}/regenerate`, {
            method: 'POST',
            body: JSON.stringify(options),
        });
    }

    async refineMaterials(materialId, feedback) {
        return this.request(`/materials/${materialId}/refine`, {
            method: 'POST',
            body: JSON.stringify({ feedback }),
        });
    }

    async searchContent(query) {
        return this.request('/materials/search', {
            method: 'POST',
            body: JSON.stringify({ query }),
        });
    }

    /**
     * Analytics endpoints
     */
    async logMaterialAccess(materialId) {
        return this.request('/analytics/log-access', {
            method: 'POST',
            body: JSON.stringify({ materialId }),
        });
    }

    async logMaterialDownload(materialId, format) {
        return this.request('/analytics/log-download', {
            method: 'POST',
            body: JSON.stringify({ materialId, format }),
        });
    }

    async getDashboardAnalytics() {
        return this.request('/analytics/dashboard', { method: 'GET' });
    }

    async getMaterialAnalytics(materialId) {
        return this.request(`/analytics/material/${materialId}`, { method: 'GET' });
    }

    async addMaterialFeedback(materialId, rating, feedback) {
        return this.request('/analytics/feedback', {
            method: 'POST',
            body: JSON.stringify({ materialId, rating, feedback }),
        });
    }

    async exportAnalytics(format = 'csv') {
        return this.request(`/analytics/export/${format}`, { method: 'GET' });
    }

    async trackEvent(eventName, eventData = {}) {
        return this.request('/analytics/track-event', {
            method: 'POST',
            body: JSON.stringify({ 
                eventName, 
                eventData,
                timestamp: new Date().toISOString()
            }),
        });
    }

    /**
     * Status endpoints
     */
    async getQuotaStatus() {
        return this.request('/materials/status/quota', { method: 'GET' });
    }

    async getKeyStatus() {
        return this.request('/materials/status/keys', { method: 'GET' });
    }

    async getProviderStatus() {
        return this.request('/materials/status/providers', { method: 'GET' });
    }
}

// Create global API instance
const api = new APIManager();
