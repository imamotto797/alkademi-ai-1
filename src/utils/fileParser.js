const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

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
      throw error;
    }
  }

  // Parse plain text files
  parseTextFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  // Parse PDF files
  async parsePDFFile(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  // Parse DOCX files
  async parseDocxFile(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
}

module.exports = new FileParser();