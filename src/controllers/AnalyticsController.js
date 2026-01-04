const { pool } = require('../models/initDB');

class AnalyticsController {
  /**
   * Log material access
   */
  static async logMaterialAccess(req, res) {
    try {
      const { materialId, studentIdentifier, sessionId } = req.body;
      const studentIp = req.ip || req.connection.remoteAddress;

      if (!materialId || !studentIdentifier) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await pool.query(
        `INSERT INTO material_access_logs (material_id, student_identifier, student_ip, session_id)
         VALUES ($1, $2, $3, $4)`,
        [materialId, studentIdentifier, studentIp, sessionId || null]
      );

      res.json({ success: true, message: 'Access logged' });
    } catch (error) {
      console.error('Error logging access:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update time spent on material
   */
  static async updateTimeSpent(req, res) {
    try {
      const { materialId, studentIdentifier, timeSpentSeconds } = req.body;

      if (!materialId || !studentIdentifier || timeSpentSeconds === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await pool.query(
        `UPDATE material_access_logs 
         SET time_spent_seconds = $1
         WHERE material_id = $2 AND student_identifier = $3
         ORDER BY accessed_at DESC LIMIT 1`,
        [timeSpentSeconds, materialId, studentIdentifier]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating time spent:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Log material download
   */
  static async logDownload(req, res) {
    try {
      const { materialId, studentIdentifier, format } = req.body;
      const studentIp = req.ip || req.connection.remoteAddress;

      if (!materialId || !studentIdentifier) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await pool.query(
        `INSERT INTO material_downloads (material_id, student_identifier, student_ip, format)
         VALUES ($1, $2, $3, $4)`,
        [materialId, studentIdentifier, studentIp, format || 'pdf']
      );

      res.json({ success: true, message: 'Download logged' });
    } catch (error) {
      console.error('Error logging download:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get analytics for a specific material
   */
  static async getMaterialAnalytics(req, res) {
    try {
      const { materialId } = req.params;
      const { timeRange } = req.query; // 'week', 'month', 'all'

      if (!materialId) {
        return res.status(400).json({ error: 'Material ID required' });
      }

      let dateFilter = '';
      if (timeRange === 'week') {
        dateFilter = `AND accessed_at >= NOW() - INTERVAL '7 days'`;
      } else if (timeRange === 'month') {
        dateFilter = `AND accessed_at >= NOW() - INTERVAL '30 days'`;
      }

      // Total views
      const viewsResult = await pool.query(
        `SELECT COUNT(*) as total_views FROM material_access_logs 
         WHERE material_id = $1 ${dateFilter}`,
        [materialId]
      );

      // Unique viewers
      const uniqueResult = await pool.query(
        `SELECT COUNT(DISTINCT student_identifier) as unique_viewers FROM material_access_logs 
         WHERE material_id = $1 ${dateFilter}`,
        [materialId]
      );

      // Total downloads
      const downloadsResult = await pool.query(
        `SELECT COUNT(*) as total_downloads FROM material_downloads 
         WHERE material_id = $1 ${dateFilter}`,
        [materialId]
      );

      // Average time spent
      const timeResult = await pool.query(
        `SELECT AVG(time_spent_seconds) as avg_time_spent,
                MAX(time_spent_seconds) as max_time_spent,
                MIN(time_spent_seconds) as min_time_spent
         FROM material_access_logs 
         WHERE material_id = $1 AND time_spent_seconds > 0 ${dateFilter}`,
        [materialId]
      );

      // Access trend (daily)
      const trendResult = await pool.query(
        `SELECT DATE(accessed_at) as date, COUNT(*) as views
         FROM material_access_logs
         WHERE material_id = $1 ${dateFilter}
         GROUP BY DATE(accessed_at)
         ORDER BY DATE(accessed_at) DESC`,
        [materialId]
      );

      // Average rating and feedback count
      const ratingResult = await pool.query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as feedback_count
         FROM material_feedback
         WHERE material_id = $1 ${dateFilter}`,
        [materialId]
      );

      res.json({
        materialId,
        totalViews: parseInt(viewsResult.rows[0]?.total_views) || 0,
        uniqueViewers: parseInt(uniqueResult.rows[0]?.unique_viewers) || 0,
        totalDownloads: parseInt(downloadsResult.rows[0]?.total_downloads) || 0,
        avgTimeSpent: Math.round(timeResult.rows[0]?.avg_time_spent) || 0,
        maxTimeSpent: timeResult.rows[0]?.max_time_spent || 0,
        minTimeSpent: timeResult.rows[0]?.min_time_spent || 0,
        avgRating: parseFloat(ratingResult.rows[0]?.avg_rating)?.toFixed(2) || 'N/A',
        feedbackCount: parseInt(ratingResult.rows[0]?.feedback_count) || 0,
        accessTrend: trendResult.rows
      });
    } catch (error) {
      console.error('Error fetching material analytics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get overall analytics dashboard
   */
  static async getDashboardAnalytics(req, res) {
    try {
      const { timeRange } = req.query;

      let dateFilter = '';
      if (timeRange === 'week') {
        dateFilter = `WHERE accessed_at >= NOW() - INTERVAL '7 days'`;
      } else if (timeRange === 'month') {
        dateFilter = `WHERE accessed_at >= NOW() - INTERVAL '30 days'`;
      }

      // Total views across all materials
      const totalViewsResult = await pool.query(
        `SELECT COUNT(*) as total_views FROM material_access_logs ${dateFilter}`
      );

      // Total unique students
      const uniqueStudentsResult = await pool.query(
        `SELECT COUNT(DISTINCT student_identifier) as unique_students FROM material_access_logs ${dateFilter}`
      );

      // Most accessed materials
      const topMaterialsResult = await pool.query(
        `SELECT m.id, m.title, COUNT(*) as view_count
         FROM material_access_logs mal
         JOIN materials m ON mal.material_id = m.id
         ${dateFilter}
         GROUP BY m.id, m.title
         ORDER BY view_count DESC
         LIMIT 10`
      );

      // Total downloads
      const totalDownloadsResult = await pool.query(
        `SELECT COUNT(*) as total_downloads FROM material_downloads ${dateFilter}`
      );

      // Peak access times (hour of day)
      const peakTimesResult = await pool.query(
        `SELECT EXTRACT(HOUR FROM accessed_at) as hour, COUNT(*) as views
         FROM material_access_logs
         ${dateFilter}
         GROUP BY EXTRACT(HOUR FROM accessed_at)
         ORDER BY hour`
      );

      // Overall average rating
      const overallRatingResult = await pool.query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedback
         FROM material_feedback
         ${dateFilter.replace('WHERE', 'WHERE')}`
      );

      // Top rated materials
      const topRatedResult = await pool.query(
        `SELECT m.id, m.title, AVG(mf.rating) as avg_rating, COUNT(*) as rating_count
         FROM material_feedback mf
         JOIN materials m ON mf.material_id = m.id
         ${dateFilter}
         GROUP BY m.id, m.title
         HAVING COUNT(*) >= 2
         ORDER BY avg_rating DESC
         LIMIT 10`
      );

      res.json({
        summary: {
          totalViews: parseInt(totalViewsResult.rows[0]?.total_views) || 0,
          uniqueStudents: parseInt(uniqueStudentsResult.rows[0]?.unique_students) || 0,
          totalDownloads: parseInt(totalDownloadsResult.rows[0]?.total_downloads) || 0,
          overallAvgRating: parseFloat(overallRatingResult.rows[0]?.avg_rating)?.toFixed(2) || 'N/A',
          totalFeedback: parseInt(overallRatingResult.rows[0]?.total_feedback) || 0
        },
        topMaterials: topMaterialsResult.rows,
        peakAccessTimes: peakTimesResult.rows,
        topRatedMaterials: topRatedResult.rows,
        timeRange: timeRange || 'all'
      });
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Submit material feedback/rating
   */
  static async submitFeedback(req, res) {
    try {
      const { materialId, studentIdentifier, rating, feedbackText } = req.body;

      if (!materialId || !studentIdentifier || !rating) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      await pool.query(
        `INSERT INTO material_feedback (material_id, student_identifier, rating, feedback_text)
         VALUES ($1, $2, $3, $4)`,
        [materialId, studentIdentifier, rating, feedbackText || null]
      );

      res.json({ success: true, message: 'Feedback submitted' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get search analytics
   */
  static async getSearchAnalytics(req, res) {
    try {
      const { timeRange } = req.query;

      let dateFilter = '';
      if (timeRange === 'week') {
        dateFilter = `WHERE searched_at >= NOW() - INTERVAL '7 days'`;
      } else if (timeRange === 'month') {
        dateFilter = `WHERE searched_at >= NOW() - INTERVAL '30 days'`;
      }

      // Most searched queries
      const topSearchesResult = await pool.query(
        `SELECT search_query, COUNT(*) as search_count,
                SUM(CASE WHEN result_clicked THEN 1 ELSE 0 END) as clicks
         FROM search_analytics
         ${dateFilter}
         GROUP BY search_query
         ORDER BY search_count DESC
         LIMIT 15`
      );

      // Search conversion rate
      const conversionResult = await pool.query(
        `SELECT 
          COUNT(*) as total_searches,
          SUM(CASE WHEN result_clicked THEN 1 ELSE 0 END) as successful_clicks,
          ROUND(100.0 * SUM(CASE WHEN result_clicked THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate
         FROM search_analytics
         ${dateFilter}`
      );

      res.json({
        topSearches: topSearchesResult.rows,
        searchStats: conversionResult.rows[0] || {
          total_searches: 0,
          successful_clicks: 0,
          conversion_rate: 0
        }
      });
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Log search query
   */
  static async logSearch(req, res) {
    try {
      const { searchQuery, materialIdClicked, studentIdentifier, rankInResults } = req.body;

      if (!searchQuery || !studentIdentifier) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await pool.query(
        `INSERT INTO search_analytics (search_query, material_id_clicked, student_identifier, result_clicked, rank_in_results)
         VALUES ($1, $2, $3, $4, $5)`,
        [searchQuery, materialIdClicked || null, studentIdentifier, materialIdClicked ? true : false, rankInResults || null]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error logging search:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Export analytics as CSV
   */
  static async exportAnalytics(req, res) {
    try {
      const { materialId } = req.params;

      const result = await pool.query(
        `SELECT student_identifier, accessed_at, time_spent_seconds
         FROM material_access_logs
         WHERE material_id = $1
         ORDER BY accessed_at DESC`,
        [materialId]
      );

      // Convert to CSV
      let csv = 'Student,Accessed At,Time Spent (seconds)\n';
      result.rows.forEach(row => {
        csv += `"${row.student_identifier}","${row.accessed_at}","${row.time_spent_seconds}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="material-${materialId}-analytics.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AnalyticsController;
