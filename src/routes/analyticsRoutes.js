const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');

// Track generic events
router.post('/track-event', AnalyticsController.trackEvent || ((req, res) => res.json({ success: true })));

// Log material access
router.post('/log-access', AnalyticsController.logMaterialAccess);

// Update time spent on material
router.post('/update-time-spent', AnalyticsController.updateTimeSpent);

// Log material download
router.post('/log-download', AnalyticsController.logDownload);

// Get analytics for a specific material
router.get('/material/:materialId', AnalyticsController.getMaterialAnalytics);

// Get overall dashboard analytics
router.get('/dashboard', AnalyticsController.getDashboardAnalytics);

// Submit material feedback/rating
router.post('/feedback', AnalyticsController.submitFeedback);

// Get search analytics
router.get('/search', AnalyticsController.getSearchAnalytics);

// Log search query
router.post('/log-search', AnalyticsController.logSearch);

// Export analytics as CSV
router.get('/export/:materialId', AnalyticsController.exportAnalytics);

module.exports = router;
