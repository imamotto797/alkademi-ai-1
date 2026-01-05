const { Pool } = require('pg');

// Make database connection optional
let pool = null;

console.log('🔍 Checking NEON_DB_URL:', process.env.NEON_DB_URL ? '✅ Found' : '❌ Missing');
console.log('🔍 All env vars:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('NEON')));

if (process.env.NEON_DB_URL) {
  pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
  });
} else {
  console.warn('⚠️ NEON_DB_URL not configured. Database features will be disabled.');
}

const initDB = async () => {
  // If no database connection, skip initialization
  if (!pool) {
    console.warn('⚠️ Skipping database initialization - no database URL provided');
    return;
  }
  
  try {
    // Enable pgvector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    // Create materials table with is_deleted for soft deletes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        source_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP
      )
    `);

    // Add soft delete columns if they don't exist (for existing tables)
    try {
      await pool.query(`ALTER TABLE materials ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE`);
    } catch (err) {
      // Column already exists, skip
      if (!err.message.includes('already exists')) throw err;
    }

    try {
      await pool.query(`ALTER TABLE materials ADD COLUMN deleted_at TIMESTAMP`);
    } catch (err) {
      // Column already exists, skip
      if (!err.message.includes('already exists')) throw err;
    }
    
    // Add index on creation date for sorting
    await pool.query(`
      CREATE INDEX IF NOT EXISTS materials_created_at_idx 
      ON materials(created_at DESC)
      WHERE is_deleted = FALSE
    `);

    // Add index on title for search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS materials_title_idx 
      ON materials(title)
      WHERE is_deleted = FALSE
    `);
    
    // Create embeddings table for vector search
    // Google embedding-001 produces 768-dimensional vectors
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_embeddings (
        id SERIAL PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding vector(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster similarity search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS material_embeddings_embedding_idx 
      ON material_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    // Add index on material_id for foreign key joins
    await pool.query(`
      CREATE INDEX IF NOT EXISTS material_embeddings_material_id_idx 
      ON material_embeddings(material_id)
    `);

    // Create analytics tables
    // Track material access
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_access_logs (
        id SERIAL PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        student_identifier VARCHAR(255),
        student_ip VARCHAR(50),
        accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        time_spent_seconds INTEGER DEFAULT 0,
        session_id VARCHAR(100)
      )
    `);

    // Create index on material_id and accessed_at for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS material_access_logs_material_idx 
      ON material_access_logs(material_id, accessed_at DESC)
    `);

    // Add index for session analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS material_access_logs_session_idx 
      ON material_access_logs(session_id, accessed_at DESC)
    `);

    // Track material downloads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_downloads (
        id SERIAL PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        student_identifier VARCHAR(255),
        student_ip VARCHAR(50),
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        format VARCHAR(50) DEFAULT 'pdf'
      )
    `);

    // Add index for download tracking
    await pool.query(`
      CREATE INDEX IF NOT EXISTS material_downloads_material_idx 
      ON material_downloads(material_id, downloaded_at DESC)
    `);

    // Track search queries and engagement
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id SERIAL PRIMARY KEY,
        search_query TEXT,
        material_id_clicked INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        student_identifier VARCHAR(255),
        searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        result_clicked BOOLEAN DEFAULT FALSE,
        rank_in_results INTEGER
      )
    `);

    // Add index for search analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS search_analytics_query_idx 
      ON search_analytics(search_query, searched_at DESC)
    `);

    // Track material ratings/feedback
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_feedback (
        id SERIAL PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        student_identifier VARCHAR(255),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add index for feedback analysis
    await pool.query(`
      CREATE INDEX IF NOT EXISTS material_feedback_material_idx 
      ON material_feedback(material_id, rating)
    `);

    // Create archived materials table for old materials (optional partition strategy)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS materials_archive (
        id SERIAL PRIMARY KEY,
        material_id INTEGER,
        title VARCHAR(255),
        content TEXT,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        original_created_at TIMESTAMP
      )
    `);

    // Create provider performance tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_performance (
        id SERIAL PRIMARY KEY,
        provider_name VARCHAR(50),
        request_duration INTEGER,
        success BOOLEAN,
        tokens_used INTEGER,
        error_message TEXT,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add index for provider analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS provider_performance_provider_idx 
      ON provider_performance(provider_name, recorded_at DESC)
    `);
    
    console.log('✅ Database initialized successfully with optimizations');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { pool, initDB };