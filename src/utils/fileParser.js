const fs = require('fs');
const path = require('path');

// Lazy load pdf-parse and mammoth to handle optional dependencies
let pdf;
let mammoth;

try {
  pdf = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse not available, PDF parsing will be limited');
}

try {
  mammoth = require('mammoth');
} catch (e) {
  console.warn('mammoth not available, DOCX parsing will be limited');
}

class FileParser {
  // Parse different file types and extract text
  async parseFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.txt':
          return this.parseTextFile(filePath);
        case '.pdf':
          return this.parsePDFFile(filePath);
        case '.docx':
          return this.parseDocxFile(filePath);
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      // Fallback: return filename as placeholder text
      const filename = path.basename(filePath);
      console.warn(`Returning fallback text for ${filename}`);
      return `[Content from ${filename}]\n\nNote: Full file parsing not available. File uploaded but content could not be fully extracted. Please ensure pdf-parse and mammoth packages are installed.`;
    }
  }

  // Parse plain text files
  parseTextFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  // Parse PDF files
  async parsePDFFile(filePath) {
    if (!pdf) {
      throw new Error('pdf-parse module not available');
    }
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF parsing failed:', error.message);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  // Parse DOCX files
  async parseDocxFile(filePath) {
    if (!mammoth) {
      throw new Error('mammoth module not available');
    }
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('DOCX parsing failed:', error.message);
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }
}

module.exports = new FileParser();