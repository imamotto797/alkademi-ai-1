const { pool } = require('../models/initDB');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const quotaService = require('./QuotaService');
const keyManager = require('./KeyManager');

class VectorService {
  // Generate embeddings for text chunks
  async generateEmbeddings(textChunks) {
    const embeddings = [];
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return embeddings;
    }
    
    for (const chunk of textChunks) {
      let keyAttempts = 0;
      const maxKeyAttempts = keyManager.getKeyCount();
      let success = false;
      
      while (keyAttempts < maxKeyAttempts && !success) {
        try {
          // Get next available key
          const apiKey = keyManager.getNextKey();
          if (!apiKey) {
            console.warn('⚠️ No available API keys for embeddings, skipping remaining chunks');
            break;
          }
          
          // Check rate limit
          if (quotaService.isRateLimitExceeded()) {
            console.warn('⚠️ Rate limit approaching for embeddings, skipping remaining chunks');
            break;
          }
          
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
          const result = await model.embedContent(chunk);
          
          embeddings.push({
            text: chunk,
            embedding: result.embedding.values
          });
          
          // Track successful request
          keyManager.trackRequest(apiKey);
          quotaService.trackGeminiRequest(chunk.length);
          console.log(`✓ Generated embedding with ${result.embedding.values.length} dimensions`);
          success = true;
        } catch (error) {
          const apiKey = keyManager.getNextKey();
          const keyNum = apiKey ? keyManager.keys.indexOf(apiKey) + 1 : '?';
          
          // Handle quota errors gracefully
          if (error.message.includes('429') || error.message.includes('quota')) {
            console.warn(`⚠️ Key ${keyNum} quota exceeded for embeddings`);
            if (apiKey) {
              keyManager.markQuotaExceeded(apiKey);
              keyManager.recordError(apiKey, error);
            }
            
            keyAttempts++;
            if (keyAttempts < maxKeyAttempts) {
              console.log(`⏭️  Trying next API key for embedding...`);
              continue;
            } else {
              console.warn('⚠️ All embedding API keys quota-limited, stopping batch');
              quotaService.logQuotaStatus();
              break;
            }
          }
          
          console.error(`Error generating embedding (Key ${keyNum}):`, error.message);
          if (apiKey) keyManager.recordError(apiKey, error);
          break;
        }
      }
      
      if (!success && keyAttempts > 0) {
        console.warn(`Failed to generate embedding after ${keyAttempts} key attempts`);
      }
    }
    
    if (embeddings.length > 0) {
      console.log(`✓ Generated ${embeddings.length}/${textChunks.length} embeddings`);
    }
    return embeddings;
  }

  // Store embeddings in the database
  async storeEmbeddings(materialId, embeddings) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const { text, embedding } of embeddings) {
        // Convert embedding array to pgvector format (string representation of array)
        const vectorString = `[${embedding.join(',')}]`;
        
        await client.query(
          'INSERT INTO material_embeddings (material_id, chunk_text, embedding) VALUES ($1, $2, $3)',
          [materialId, text, vectorString]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing embeddings:', error);
      return false;
    } finally {
      client.release();
    }
  }

  // Search for relevant content using vector similarity
  async searchSimilarContent(query, limit = 5) {
    try {
      // Get an available API key for generating query embedding
      const apiKey = keyManager.getNextKey();
      if (!apiKey) {
        console.warn('⚠️ No available API keys for search, returning empty results');
        return [];
      }
      
      // Generate embedding for the query
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const embeddingResult = await model.embedContent(query);
      const queryEmbedding = embeddingResult.embedding.values;
      
      console.log(`Query embedding dimension: ${queryEmbedding.length}`);
      
      // Track request for quota
      keyManager.trackRequest(apiKey);
      quotaService.trackGeminiRequest(query.length);
      
      // Format vector as pgvector string: [0.001, 0.002, ...]
      const vectorString = `[${queryEmbedding.join(',')}]`;
      
      // Search for similar content
      const result = await pool.query(`
        SELECT 
          material_id,
          chunk_text,
          1 - (embedding <=> $1) as similarity
        FROM material_embeddings
        ORDER BY embedding <=> $1
        LIMIT $2
      `, [vectorString, limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Error searching similar content:', error);
      return [];
    }
  }
}

module.exports = new VectorService();