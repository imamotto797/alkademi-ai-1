-- Fix embeddings table for Google's text-embedding-004 model (768 dimensions)

-- Drop existing table and recreate with correct dimensions
DROP TABLE IF EXISTS material_embeddings CASCADE;

CREATE TABLE material_embeddings (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster similarity search
CREATE INDEX material_embeddings_embedding_idx 
ON material_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verify the table structure
\d material_embeddings
