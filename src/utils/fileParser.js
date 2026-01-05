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
  async parseFile(filePathOrBuffer, originalFilename = null) {
    try {
      // Determine file extension
      let ext;
      if (Buffer.isBuffer(filePathOrBuffer)) {
        // Buffer from memory storage - need originalFilename
        if (!originalFilename) {
          throw new Error('originalFilename required when parsing from buffer');
        }
        ext = path.extname(originalFilename).toLowerCase();
      } else {
        // File path from disk storage
        ext = path.extname(filePathOrBuffer).toLowerCase();
      }
      
      switch (ext) {
        case '.txt':
          return this.parseTextFile(filePathOrBuffer);
        case '.pdf':
          return this.parsePDFFile(filePathOrBuffer);
        case '.docx':
          return this.parseDocxFile(filePathOrBuffer);
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      console.error(`Error parsing file:`, error);
      // Fallback: return filename as placeholder text
      const filename = Buffer.isBuffer(filePathOrBuffer) 
        ? originalFilename 
        : path.basename(filePathOrBuffer);
      console.warn(`Returning fallback text for ${filename}`);
      return `[Content from ${filename}]\n\nNote: Full file parsing not available. File uploaded but content could not be fully extracted. Please ensure pdf-parse and mammoth packages are installed.`;
    }
  }

  // Parse plain text files (handles both file paths and buffers)
  parseTextFile(filePathOrBuffer) {
    if (Buffer.isBuffer(filePathOrBuffer)) {
      return filePathOrBuffer.toString('utf8');
    }
    return fs.readFileSync(filePathOrBuffer, 'utf8');
  }

  // Parse PDF files (handles both file paths and buffers)
  async parsePDFFile(filePathOrBuffer) {
    if (!pdf) {
      throw new Error('pdf-parse module not available');
    }
    try {
      let dataBuffer;
      if (Buffer.isBuffer(filePathOrBuffer)) {
        dataBuffer = filePathOrBuffer;
      } else {
        dataBuffer = fs.readFileSync(filePathOrBuffer);
      }
      
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF parsing failed:', error.message);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  // Parse DOCX files (handles both file paths and buffers)
  async parseDocxFile(filePathOrBuffer) {
    if (!mammoth) {
      throw new Error('mammoth module not available');
    }
    try {
      let result;
      if (Buffer.isBuffer(filePathOrBuffer)) {
        // mammoth needs a buffer or ArrayBuffer for binary formats
        result = await mammoth.extractRawText({ buffer: filePathOrBuffer });
      } else {
        result = await mammoth.extractRawText({ path: filePathOrBuffer });
      }
      return result.value;
    } catch (error) {
      console.error('DOCX parsing failed:', error.message);
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }
}

module.exports = new FileParser();