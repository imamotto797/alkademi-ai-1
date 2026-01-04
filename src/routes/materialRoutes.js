const express = require('express');
const router = express.Router();
const materialController = require('../controllers/MaterialController');

// Upload a single source file
router.post('/upload', materialController.upload.single('file'), materialController.uploadSource);

// Upload multiple source files
router.post('/upload-multiple', materialController.upload.array('files', 10), materialController.uploadMultipleSources);

// Upload and combine multiple source files into one material
router.post('/upload-combined', materialController.upload.array('files', 10), materialController.uploadCombinedSources);

// Generate teaching materials from a source
router.post('/:materialId/generate', materialController.generateMaterials);

// Regenerate teaching materials from a source (replaces previous generation)
router.post('/:materialId/regenerate', materialController.regenerateMaterials);

// Refine materials based on feedback
router.post('/:materialId/refine', materialController.refineMaterials);

// Contextual search using semantic retrieval
router.post('/search', materialController.searchContent);

// Get quota status
router.get('/status/quota', materialController.getQuotaStatus);

// Get API key status
router.get('/status/keys', materialController.getKeyStatus);

// Get AI provider status
router.get('/status/providers', materialController.getProviderStatus);

// Get all materials
router.get('/', materialController.getAllMaterials);

// Get a specific material
router.get('/:id', materialController.getMaterial);

// Update a material
router.put('/:id', materialController.updateMaterial);

// Delete a material
router.delete('/:id', materialController.deleteMaterial);

module.exports = router;