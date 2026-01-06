const { pool } = require('./initDB');

class MaterialModel {
  // Create a new material
  async create(title, content, sourceType, metadata = {}) {
    const {
      sourceFilename = null,
      sourceFiles = null,
      parentMaterialId = null
    } = metadata;

    try {
      const result = await pool.query(
        'INSERT INTO materials (title, content, source_type, source_filename, source_files, parent_material_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, content, sourceType, sourceFilename, sourceFiles, parentMaterialId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    }
  }

  // Get a material by ID
  async getById(id) {
    try {
      const result = await pool.query('SELECT * FROM materials WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting material:', error);
      throw error;
    }
  }

  // Get all materials
  async getAll() {
    try {
      const result = await pool.query('SELECT * FROM materials ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error getting materials:', error);
      throw error;
    }
  }

  // Update a material
  async update(id, title, content) {
    try {
      const result = await pool.query(
        'UPDATE materials SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [title, content, id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  }

  // Delete a material
  async delete(id) {
    try {
      await pool.query('DELETE FROM materials WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  }

  // Find a material by title
  async findByTitle(title) {
    try {
      const result = await pool.query('SELECT * FROM materials WHERE title = $1', [title]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding material by title:', error);
      throw error;
    }
  }

  // Find generated materials by their parent source material
  async findByParentId(parentMaterialId) {
    try {
      const result = await pool.query(
        'SELECT * FROM materials WHERE parent_material_id = $1 ORDER BY created_at DESC',
        [parentMaterialId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding materials by parent ID:', error);
      throw error;
    }
  }

  // Delete all materials linked to a parent source (used to drop generated modules)
  async deleteByParentId(parentMaterialId) {
    try {
      await pool.query('DELETE FROM materials WHERE parent_material_id = $1', [parentMaterialId]);
      return true;
    } catch (error) {
      console.error('Error deleting materials by parent ID:', error);
      throw error;
    }
  }
}

module.exports = new MaterialModel();