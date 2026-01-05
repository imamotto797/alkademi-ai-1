/**
 * Analytics.js - Analytics module
 * Handles displaying dashboard analytics and statistics
 */

class AnalyticsModule {
    constructor() {
        this.analyticsData = null;
        this.init();
        
        // Track module view
        api.trackEvent('module_view', { module: 'analytics' }).catch(console.error);
    }

    init() {
        console.log('[AnalyticsModule] Initializing...');
        if (!document.getElementById('analytics')) {
            console.warn('[AnalyticsModule] analytics element not found - skipping init');
            return;
        }

        document.getElementById('refreshAnalyticsBtn').addEventListener('click', () => this.loadAnalytics());
        document.getElementById('exportAnalyticsBtn').addEventListener('click', () => this.exportAnalytics());

        this.loadAnalytics();
        console.log('[AnalyticsModule] Initialization complete');
    }

    async loadAnalytics() {
        const loading = document.getElementById('analyticsLoading');
        const error = document.getElementById('analyticsError');

        utils.DOM.show(loading);
        utils.DOM.hide(error);

        try {
            this.analyticsData = await api.getDashboardAnalytics();
            this.renderDashboard();
            utils.Notification.success('Analytics updated');
        } catch (err) {
            const errorMsg = err.message || 'Failed to load analytics';
            document.getElementById('analyticsError').textContent = errorMsg;
            utils.DOM.show(error);
            utils.Notification.error(errorMsg);
        } finally {
            utils.DOM.hide(loading);
        }
    }

    renderDashboard() {
        if (!this.analyticsData) return;

        const data = this.analyticsData;
        const summary = data.summary || {};

        // Summary stats
        this.updateStat('totalAccessCount', summary.totalViews || 0);
        this.updateStat('totalDownloadCount', summary.totalDownloads || 0);
        this.updateStat('avgRatingDisplay', (summary.overallAvgRating || 0) + ' ⭐');
        this.updateStat('totalMaterialsCount', (data.topMaterials?.length || 0));

        // Top materials
        this.renderTopMaterials(data.topMaterials || []);

        // Peak access times
        this.renderPeakAccessTimes(data.peakAccessTimes || []);

        // Top rated materials
        this.renderTopRatedMaterials(data.topRatedMaterials || []);
    }

    updateStat(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value;
    }

    renderTopMaterials(materials) {
        const container = document.getElementById('topMaterials');
        utils.DOM.clear(container);

        if (materials.length === 0) {
            container.innerHTML = '<p style="color: #999;">No materials with access yet</p>';
            return;
        }

        materials.forEach((material, index) => {
            const div = document.createElement('div');
            div.className = 'top-material-item';
            div.innerHTML = `
                <div class="top-material-rank">#${index + 1}</div>
                <div class="top-material-info">
                    <div class="top-material-name">${utils.DataFormatter.truncate(material.title, 50)}</div>
                    <div class="top-material-stats">
                        Views: ${material.view_count}
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    renderPeakAccessTimes(times) {
        // This could be rendered as a chart or simply listed
        console.log('Peak access times:', times);
    }

    renderTopRatedMaterials(materials) {
        // Enhance topMaterials if ratings available
        console.log('Top rated materials:', materials);
    }

    renderSearchAnalytics(searches) {
        const container = document.getElementById('searchAnalytics');
        utils.DOM.clear(container);

        if (searches.length === 0) {
            container.innerHTML = '<p style="color: #999;">No search data available</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'analytics-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Query</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                ${searches.slice(0, 10).map(s => `
                    <tr>
                        <td>${s.query || 'N/A'}</td>
                        <td>${s.count || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.appendChild(table);
    }

    renderRecentFeedback(feedbacks) {
        const container = document.getElementById('recentFeedback');
        utils.DOM.clear(container);

        if (feedbacks.length === 0) {
            container.innerHTML = '<p style="color: #999;">No feedback yet</p>';
            return;
        }

        feedbacks.forEach(feedback => {
            const div = document.createElement('div');
            div.className = 'feedback-item';
            
            const rating = Math.round(feedback.rating || 0);
            const ratingStars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
            
            div.innerHTML = `
                <div class="feedback-header">
                    <strong>${utils.DataFormatter.truncate(feedback.title || 'Untitled', 40)}</strong>
                    <span>${ratingStars}</span>
                </div>
                <p style="margin: 8px 0; color: #555; font-size: 13px;">${utils.DataFormatter.truncate(feedback.text || 'No text', 150)}</p>
            `;
            container.appendChild(div);
        });
    }

    renderDownloadFormats(formats) {
        const container = document.getElementById('downloadFormats');
        utils.DOM.clear(container);

        const entries = Object.entries(formats);
        if (entries.length === 0) {
            container.innerHTML = '<p style="color: #999;">No downloads yet</p>';
            return;
        }

        const total = entries.reduce((sum, [_, count]) => sum + count, 0);

        entries.forEach(([format, count]) => {
            const percentage = (count / total) * 100;
            const div = document.createElement('div');
            div.className = 'format-bar';
            
            div.innerHTML = `
                <div class="format-label">
                    <span>${format.toUpperCase()}</span>
                    <span>${count} (${Math.round(percentage)}%)</span>
                </div>
                <div class="format-bar-container">
                    <div class="format-bar-fill" style="width: ${percentage}%; background: var(--primary-color);"></div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async exportAnalytics() {
        try {
            const response = await api.exportAnalytics('csv');
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `analytics_${timestamp}.csv`;
            
            const blob = new Blob([response], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);

            utils.Notification.success('Analytics exported successfully');
        } catch (error) {
            utils.Notification.error('Failed to export analytics');
        }
    }
}
