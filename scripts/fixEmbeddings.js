require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DB_URL,
});

const fixEmbeddingsTable = async () => {
  try {
    console.log('Fixing embeddings table...');
    
    // Drop existing table
    await pool.query('DROP TABLE IF EXISTS material_embeddings CASCADE');
    console.log('✓ Dropped old embeddings table');
    
    // Create new table with correct dimensions for Google text-embedding-004 (768)
    await pool.query(`
      CREATE TABLE material_embeddings (
        id SERIAL PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding vector(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created new embeddings table with 768 dimensions');
    
    // Create index for faster similarity search
    await pool.query(`
      CREATE INDEX material_embeddings_embedding_idx 
      ON material_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log('✓ Created similarity search index');
    
    console.log('\n✅ Embeddings table fixed successfully!');
    console.log('You can now upload files and embeddings will be generated automatically.');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error fixing embeddings table:', error.message);
    await pool.end();
    process.exit(1);
  }
};

fixEmbeddingsTable();
