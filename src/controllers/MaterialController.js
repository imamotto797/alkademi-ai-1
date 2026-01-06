const materialModel = require('../models/materialModel');
const nlpService = require('../services/NLPalg');
const vectorService = require('../services/VectorService');
const llmService = require('../services/LLMService');
const quotaService = require('../services/QuotaService');
const fileParser = require('../utils/fileParser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure a unique title by appending version suffix when needed
const ensureUniqueTitle = async (baseTitle) => {
  try {
    const existing = await materialModel.findByTitle(baseTitle);
    if (!existing) return baseTitle;
    let idx = 2;
    while (true) {
      const candidate = `${baseTitle} (v${idx})`;
      const hit = await materialModel.findByTitle(candidate);
      if (!hit) return candidate;
      idx++;
    }
  } catch (_e) {
    // On error, fall back to timestamped title to avoid collision
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${baseTitle} (${stamp})`;
  }
};

// Map UI generationType to human-friendly display label
const getDisplayType = (t) => {
  const map = {
    learning_materials: 'Learning Materials',
    learning_planner: 'Learning Planner',
    questions: 'Questions',
    quiz: 'Quiz'
  };
  if (!t) return 'Teaching Materials';
  const key = String(t).toLowerCase();
  return map[key] || t; // If already human-readable, return as-is
};

// Map UI style to human-friendly label
const getStyleLabel = (s) => {
  const map = {
    academic: 'Academic',
    formal: 'Formal',
    casual: 'Casual',
    storytelling: 'Storytelling'
  };
  if (!s) return 'Academic';
  const key = String(s).toLowerCase();
  return map[key] || s;
};

// Map UI education level to human-friendly label
const getLevelLabel = (lvl, targetAudience) => {
  const map = {
    sd: 'Elementary',
    smp: 'Junior High',
    sma: 'Senior High',
    undergraduate: 'Undergraduate',
    graduate: 'Graduate',
    professional: 'Professional'
  };
  if (lvl) {
    const key = String(lvl).toLowerCase();
    return map[key] || lvl;
  }
  // Fallback: infer from targetAudience text if provided
  const ta = String(targetAudience || '').toLowerCase();
  if (ta.includes('elementary')) return 'Elementary';
  if (ta.includes('junior')) return 'Junior High';
  if (ta.includes('senior')) return 'Senior High';
  if (ta.includes('undergraduate')) return 'Undergraduate';
  if (ta.includes('graduate')) return 'Graduate';
  if (ta.includes('professional')) return 'Professional';
  return 'General';
};

// Configure multer for file uploads
// Use memory storage for Vercel, disk storage for local development
const storage = process.env.VERCEL 
  ? multer.memoryStorage()  // Use RAM on Vercel (serverless)
  : multer.diskStorage({     // Use disk on local
      destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
      }
    });

const upload = multer({ storage });

// Upload and process a single source file
const uploadSource = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const material = await processFile(req.file, req.body.title);
    
    res.status(201).json({
      success: true,
      material: {
        id: material.id,
        title: material.title,
        sourceType: material.source_type,
        sourceFiles: material.source_files || [req.file.originalname],
        fileName: req.file.originalname,
        keyConcepts: material.keyConcepts,
        complexity: material.complexity
      }
    });
  } catch (error) {
    console.error('Error uploading source:', error);
    res.status(500).json({ error: 'Failed to upload and process source file' });
  }
};

// Upload and process multiple source files
const uploadMultipleSources = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    const errors = [];

    // Process each file
    for (const file of req.files) {
      try {
        const material = await processFile(file);
        results.push({
          id: material.id,
          title: material.title,
          sourceType: material.source_type,
          fileName: file.originalname,
          sourceFiles: material.source_files || [file.originalname],
          keyConcepts: material.keyConcepts,
          complexity: material.complexity
        });
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
        console.error(`Error processing file ${file.originalname}:`, error);
      }
    }

    res.status(201).json({
      success: true,
      processed: results.length,
      failed: errors.length,
      materials: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error uploading multiple sources:', error);
    res.status(500).json({ error: 'Failed to upload and process source files' });
  }
};

// Upload and combine source files into one material (Notebook LLM style)
const uploadCombinedSources = async (req, res) => {
  try {
    console.log('=== UPLOAD COMBINED SOURCES DEBUG ===');
    console.log('Files received:', req.files?.length || 0);
    console.log('Title:', req.body.title);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const title = req.body.title || 'Untitled Material';
    let combinedText = '';
    const fileNames = [];
    const errors = [];

    console.log(`Processing ${req.files.length} files for combined material "${title}"`);

    // Parse and combine all files
    for (const file of req.files) {
      try {
        console.log(`Parsing file: ${file.originalname}`);
        
        // Handle both disk storage (file.path) and memory storage (file.buffer)
        const fileInput = file.buffer || file.path;
        if (!fileInput) {
          throw new Error('No file data available');
        }
        
        // Pass buffer or path along with originalname for proper parsing
        const sourceText = await fileParser.parseFile(fileInput, file.originalname);
        console.log(`✓ Successfully parsed ${file.originalname}, extracted ${sourceText.length} characters`);
        fileNames.push(file.originalname);
        
        // Add section header for each file (only if multiple files)
        if (req.files.length > 1) {
          combinedText += `\n\n=== Source: ${file.originalname} ===\n\n${sourceText}`;
        } else {
          combinedText = sourceText; // Single file, no header needed
        }
        
        // Clean up the uploaded file (only needed for disk storage)
        if (file.path) {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              console.log(`✓ Cleaned up temp file: ${file.path}`);
            }
          } catch (unlinkError) {
            console.warn(`Could not delete temp file ${file.path}:`, unlinkError.message);
          }
        }
      } catch (error) {
        errors.push({ file: file.originalname, error: error.message });
        console.error(`Error processing file ${file.originalname}:`, error.message);
        // Clean up on error (only for disk storage)
        if (file.path) {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (unlinkError) {
            console.warn(`Could not clean up temp file:`, unlinkError.message);
          }
        }
      }
    }

    if (!combinedText) {
      return res.status(400).json({ error: 'Failed to extract content from any files' });
    }

    // Analyze the combined text (gracefully skip if services fail)
    let keyConcepts = [];
    let complexity = 'medium';
    try {
      keyConcepts = nlpService.extractKeyConcepts(combinedText);
      complexity = nlpService.analyzeComplexity(combinedText);
    } catch (nlpError) {
      console.warn('NLP analysis skipped:', nlpError.message);
    }
    
    // Determine source type
    const sourceType = req.files.length > 1 ? 'combined' : path.extname(req.files[0].originalname);
    
    // Create a material record with combined content
    console.log('Creating single material record...');
    let material;
    try {
      material = await materialModel.create(
        title,
        combinedText,
        sourceType,
        {
          sourceFilename: req.files.length === 1 ? req.files[0].originalname : null,
          sourceFiles: fileNames
        }
      );
      console.log(`✓ Created material ID: ${material.id}, Title: "${material.title}"`);
    } catch (dbError) {
      console.error('❌ Database error creating material:', dbError);
      throw new Error(`Failed to create material in database: ${dbError.message}`);
    }
    
    // Chunk the text for embedding (RAG pipeline)
    try {
      const textChunks = nlpService.chunkText(combinedText);
      const embeddings = await vectorService.generateEmbeddings(textChunks);
      if (embeddings.length > 0) {
        await vectorService.storeEmbeddings(material.id, embeddings);
        console.log(`✓ Stored ${embeddings.length} embeddings for material ${material.id} (${fileNames.length} source file(s))`);
      }
    } catch (embeddingError) {
      console.warn('Skipping embeddings due to error:', embeddingError.message);
    }
    
    console.log('=== UPLOAD COMBINED SUCCESS ===');
    console.log(`One material created from ${fileNames.length} files`);
    
    res.status(201).json({
      success: true,
      material: {
        id: material.id,
        title: material.title,
        sourceType: material.source_type,
        filesCount: fileNames.length,
        fileNames: fileNames,
        keyConcepts,
        complexity,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('❌ Error uploading combined sources:', error);
    console.error('Error stack:', error.stack);
    // Return detailed error for debugging (safe to expose in development/early stage)
    res.status(500).json({ 
      error: 'Failed to upload and combine source files',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      message: error.message
    });
  }
};

// Helper function to process a single file
const processFile = async (file, customTitle = null) => {
  try {
    // Parse the file to extract text (handle both buffer and path)
    const fileInput = file.buffer || file.path;
    const sourceText = await fileParser.parseFile(fileInput, file.originalname);
    
    // Analyze the source text
    const keyConcepts = nlpService.extractKeyConcepts(sourceText);
    const complexity = nlpService.analyzeComplexity(sourceText);
    
    // Create a material record
    const material = await materialModel.create(
      customTitle || path.basename(file.originalname, path.extname(file.originalname)),
      sourceText,
      path.extname(file.originalname),
      {
        sourceFilename: file.originalname,
        sourceFiles: [file.originalname]
      }
    );
    
    // Chunk the text for embedding (RAG pipeline - always enabled after NLP)
    try {
      const textChunks = nlpService.chunkText(sourceText);
      const embeddings = await vectorService.generateEmbeddings(textChunks);
      if (embeddings.length > 0) {
        await vectorService.storeEmbeddings(material.id, embeddings);
        console.log(`Stored ${embeddings.length} embeddings for material ${material.id}`);
      }
    } catch (embeddingError) {
      console.warn('Skipping embeddings due to error:', embeddingError.message);
    }
    
    // Clean up the uploaded file (only for disk storage)
    if (file.path) {
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.warn('Could not clean up temp file:', unlinkError.message);
      }
    }
    
    return {
      ...material,
      keyConcepts,
      complexity
    };
  } catch (error) {
    // Clean up the file if processing fails (only for disk storage)
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.warn('Could not clean up temp file on error:', unlinkError.message);
      }
    }
    throw error;
  }
};

// Generate teaching materials from a source
const generateMaterials = async (req, res) => {
  try {
    const { materialId } = req.params;
    const options = req.body || {};
    
    // Get the source material
    const material = await materialModel.getById(materialId);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const sourceFiles = material.source_files || (material.source_filename ? [material.source_filename] : []);
    const sourceFilename = material.source_filename || (sourceFiles.length > 0 ? sourceFiles[0] : null);
    
    // Perform semantic retrieval from VectorDB if focus areas specified
    let relevantContext = [];
    if (options.focusAreas && options.focusAreas.length > 0) {
      try {
        for (const focusArea of options.focusAreas) {
          const similarContent = await vectorService.searchSimilarContent(focusArea, 3);
          relevantContext.push(...similarContent);
        }
        console.log(`Retrieved ${relevantContext.length} relevant chunks from VectorDB`);
      } catch (error) {
        console.warn('Semantic retrieval failed:', error.message);
      }
    }
    
    // Generate teaching materials using LLM with RAG context
    const generatedMaterials = await llmService.generateTeachingMaterials(
      material.content,
      options,
      relevantContext
    );
    
    // First, delete any existing generated materials from this source
    // This prevents duplicate "Teaching Materials" from piling up
    if (options.replaceExisting === true) {
      try {
        await materialModel.deleteByParentId(material.id);
        const displayType = getDisplayType(options.generationType);
        const prevTitle = `${material.title} - ${displayType}`;
        const existingGenerated = await materialModel.findByTitle(prevTitle);
        if (existingGenerated) {
          await materialModel.delete(existingGenerated.id);
          console.log(`Replaced previous generated material (ID: ${existingGenerated.id})`);
        }
      } catch (e) {
        console.warn('Could not check for existing generated material:', e.message);
      }
    }
    
    // Create a new material record for the generated content
    const displayType = getDisplayType(options.generationType);
    const styleLabel = getStyleLabel(options.style);
    const levelLabel = getLevelLabel(options.level, options.targetAudience);
    const baseTitle = options.title && options.title.trim() !== ''
      ? options.title.trim()
      : `${material.title} - ${displayType} - ${styleLabel} - ${levelLabel}`;
    const generatedTitle = await ensureUniqueTitle(baseTitle);
    const newMaterial = await materialModel.create(
      generatedTitle,
      generatedMaterials,
      'generated',
      {
        parentMaterialId: material.id,
        sourceFilename,
        sourceFiles,
        generationType: options.generationType || 'learning_materials',
        generationTypeLabel: displayType,
        style: options.style || 'academic',
        styleLabel,
        level: options.level || null,
        levelLabel
      }
    );
    
    res.status(201).json({
      success: true,
      material: {
        id: newMaterial.id,
        title: newMaterial.title,
        content: newMaterial.content,
        sourceType: newMaterial.source_type,
        sourceFiles: newMaterial.source_files || sourceFiles,
        parentMaterialId: newMaterial.parent_material_id,
        generationType: options.generationType || 'learning_materials',
        generationTypeLabel: displayType,
        style: options.style || 'academic',
        styleLabel,
        level: options.level || null,
        levelLabel
      }
    });
  } catch (error) {
    console.error('Error generating materials:', error);
    res.status(500).json({ error: 'Failed to generate teaching materials' });
  }
};

// Get all materials
const getAllMaterials = async (req, res) => {
  try {
    // Check if database is available
    if (!materialModel || !materialModel.getAll) {
      console.warn('Database not available, returning empty materials list');
      return res.status(200).json({
        success: true,
        materials: []
      });
    }

    // Load materials from database
    const materials = await materialModel.getAll();

    res.status(200).json({
      success: true,
      materials: materials || []
    });
  } catch (error) {
    console.warn('getAllMaterials failed:', error.message);
    // Return empty array instead of 500 error for better UX
    res.status(200).json({
      success: true,
      materials: []
    });
  }
};

// Get a specific material
const getMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await materialModel.getById(id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.status(200).json({
      success: true,
      material
    });
  } catch (error) {
    console.error('Error getting material:', error);
    res.status(500).json({ error: 'Failed to retrieve material' });
  }
};

// Update a material
const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    const updatedMaterial = await materialModel.update(id, title, content);
    
    if (!updatedMaterial) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.status(200).json({
      success: true,
      material: updatedMaterial
    });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

// Delete a material and cascade delete any generated materials from it
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the material to check its title and type
    const material = await materialModel.getById(id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    // If this is a source material, also delete any generated materials from it
    if (material.source_type !== 'generated') {
      try {
        await materialModel.deleteByParentId(id);

        const generatedTitle = `${material.title} - Teaching Materials`;
        const generatedMaterial = await materialModel.findByTitle(generatedTitle);
        if (generatedMaterial) {
          await materialModel.delete(generatedMaterial.id);
          console.log(`Cascade deleted generated material (ID: ${generatedMaterial.id}) when source was deleted`);
        }
      } catch (e) {
        console.warn('Could not cascade delete generated material:', e.message);
      }
    }
    
    // Delete the source material
    const success = await materialModel.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Material deleted successfully' + (material.source_type !== 'generated' ? ' (and any generated materials from it)' : '')
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};

// Refine materials based on feedback
const refineMaterials = async (req, res) => {
  try {
    const { materialId } = req.params;
    const { feedback } = req.body;
    
    // Get the material
    const material = await materialModel.getById(materialId);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    // Refine the materials using LLM
    const refinedMaterials = await llmService.refineMaterials(
      material.content,
      feedback
    );
    
    // Update the material with the refined content
    const updatedMaterial = await materialModel.update(
      materialId,
      material.title,
      refinedMaterials
    );
    
    res.status(200).json({
      success: true,
      material: updatedMaterial
    });
  } catch (error) {
    console.error('Error refining materials:', error);
    res.status(500).json({ error: 'Failed to refine materials' });
  }
};

// Contextual search using semantic retrieval from VectorDB
const searchContent = async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Perform semantic search in VectorDB
    const results = await vectorService.searchSimilarContent(query, limit);
    
    // Get material details for each result
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const material = await materialModel.getById(result.material_id);
        return {
          materialId: result.material_id,
          materialTitle: material ? material.title : 'Unknown',
          chunkText: result.chunk_text,
          similarity: Math.round(result.similarity * 100) / 100
        };
      })
    );
    
    res.status(200).json({
      success: true,
      query,
      results: enrichedResults
    });
  } catch (error) {
    console.error('Error searching content:', error);
    res.status(500).json({ error: 'Failed to search content' });
  }
};

// Get quota status
const getQuotaStatus = async (req, res) => {
  try {
    const status = quotaService.getQuotaStatus();
    res.status(200).json({
      success: true,
      quota: status,
      links: {
        gemini: 'https://ai.google.dev/billing/workspace',
        neon: 'https://console.neon.tech'
      }
    });
  } catch (error) {
    console.error('Error getting quota status:', error);
    res.status(500).json({ error: 'Failed to get quota status' });
  }
};

// Get trial account credit warning (Gemini tier 1)
const getCreditWarning = async (req, res) => {
  try {
    const warning = quotaService.getCreditWarning();
    res.status(200).json({
      success: true,
      creditWarning: warning
    });
  } catch (error) {
    console.error('Error getting credit warning:', error);
    res.status(500).json({ error: 'Failed to get credit warning' });
  }
};

// Get API key status
const getKeyStatus = (req, res) => {
  try {
    const keyManager = require('../services/KeyManager');
    const keyStatus = keyManager.getQuotaStatus();
    res.json(keyStatus);
  } catch (error) {
    console.error('Error getting key status:', error);
    res.status(500).json({ error: 'Failed to get key status' });
  }
};

// Get AI provider status
const getProviderStatus = (req, res) => {
  try {
    const aiProviderManager = require('../services/AIProviderManager');
    const status = {
      providers: aiProviderManager.getStatus(),
      availableModels: aiProviderManager.getAvailableModels(),
      primaryProvider: process.env.PRIMARY_LLM_PROVIDER || 'gemini'
    };
    res.json(status);
  } catch (error) {
    console.error('Error getting provider status:', error);
    res.status(500).json({ error: 'Failed to get provider status' });
  }
};

// Regenerate teaching materials for a source (replaces the previously generated material)
const regenerateMaterials = async (req, res) => {
  try {
    const { materialId } = req.params;
    const options = req.body || {};
    
    // Get the source material
    const material = await materialModel.getById(materialId);
    if (!material) {
      return res.status(404).json({ error: 'Source material not found' });
    }
    
    if (material.source_type === 'generated') {
      return res.status(400).json({ error: 'Cannot regenerate a generated material. Please regenerate the source instead.' });
    }
    
    console.log(`Regenerating teaching materials for source: ${material.title}`);
    const sourceFiles = material.source_files || (material.source_filename ? [material.source_filename] : []);
    const sourceFilename = material.source_filename || (sourceFiles.length > 0 ? sourceFiles[0] : null);
    
    // Perform semantic retrieval from VectorDB if focus areas specified
    let relevantContext = [];
    if (options.focusAreas && options.focusAreas.length > 0) {
      try {
        for (const focusArea of options.focusAreas) {
          const similarContent = await vectorService.searchSimilarContent(focusArea, 3);
          relevantContext.push(...similarContent);
        }
        console.log(`Retrieved ${relevantContext.length} relevant chunks from VectorDB`);
      } catch (error) {
        console.warn('Semantic retrieval failed:', error.message);
      }
    }
    
    // Delete the existing generated material
    if (options.replaceExisting === true) {
      try {
        await materialModel.deleteByParentId(material.id);
        const displayType = getDisplayType(options.generationType);
        const prevTitle = `${material.title} - ${displayType}`;
        const existingGenerated = await materialModel.findByTitle(prevTitle);
        if (existingGenerated) {
          await materialModel.delete(existingGenerated.id);
          console.log(`Deleted previous generated material (ID: ${existingGenerated.id})`);
        }
      } catch (e) {
        console.warn('Could not delete existing generated material:', e.message);
      }
    }
    
    // Generate new teaching materials using LLM with RAG context
    const generatedMaterials = await llmService.generateTeachingMaterials(
      material.content,
      options,
      relevantContext
    );
    
    // Create a new material record for the generated content
    const displayType = getDisplayType(options.generationType);
    const styleLabel = getStyleLabel(options.style);
    const levelLabel = getLevelLabel(options.level, options.targetAudience);
    const baseTitle = options.title && options.title.trim() !== ''
      ? options.title.trim()
      : `${material.title} - ${displayType} - ${styleLabel} - ${levelLabel}`;
    const generatedTitle = await ensureUniqueTitle(baseTitle);
    const newMaterial = await materialModel.create(
      generatedTitle,
      generatedMaterials,
      'generated',
      {
        parentMaterialId: material.id,
        sourceFilename,
        sourceFiles,
        generationType: options.generationType || 'learning_materials',
        generationTypeLabel: displayType,
        style: options.style || 'academic',
        styleLabel,
        level: options.level || null,
        levelLabel
      }
    );
    
    res.status(201).json({
      success: true,
      message: 'Teaching materials regenerated successfully',
      material: {
        id: newMaterial.id,
        title: newMaterial.title,
        content: newMaterial.content,
        sourceType: newMaterial.source_type,
        sourceFiles: newMaterial.source_files || sourceFiles,
        parentMaterialId: newMaterial.parent_material_id,
        generationType: options.generationType || 'learning_materials',
        generationTypeLabel: displayType,
        style: options.style || 'academic',
        styleLabel,
        level: options.level || null,
        levelLabel
      }
    });
  } catch (error) {
    console.error('Error regenerating materials:', error);
    res.status(500).json({ error: 'Failed to regenerate teaching materials' });
  }
};

module.exports = {
  uploadSource,
  uploadMultipleSources,
  uploadCombinedSources,
  generateMaterials,
  getAllMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  refineMaterials,
  regenerateMaterials,
  searchContent,
  getQuotaStatus,
  getCreditWarning,
  getKeyStatus,
  getProviderStatus,
  upload
};