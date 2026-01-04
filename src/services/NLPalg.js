const natural = require('natural');

class NLPService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  // Extract key concepts from text
  extractKeyConcepts(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    // Remove stop words
    const stopWords = natural.stopwords;
    const filteredTokens = tokens.filter(token => !stopWords.includes(token));
    
    // Apply stemming
    const stemmedTokens = filteredTokens.map(token => this.stemmer.stem(token));
    
    // Calculate word frequency
    const frequency = {};
    stemmedTokens.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1;
    });
    
    // Sort by frequency and return top concepts
    const sortedTokens = Object.keys(frequency)
      .sort((a, b) => frequency[b] - frequency[a])
      .slice(0, 20);
    
    return sortedTokens;
  }

  // Chunk text into meaningful segments
  chunkText(text, maxChunkSize = 1000) {
    const tokenizer = new natural.SentenceTokenizer();
    const sentences = tokenizer.tokenize(text);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length < maxChunkSize) {
        currentChunk += sentence + ' ';
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = sentence + ' ';
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  // Analyze text complexity
  analyzeComplexity(text) {
    const sentenceTokenizer = new natural.SentenceTokenizer();
    const sentences = sentenceTokenizer.tokenize(text);
    const words = this.tokenizer.tokenize(text);
    
    // Calculate average words per sentence
    const avgWordsPerSentence = words.length / sentences.length;
    
    // Calculate average syllables per word (simplified)
    let syllableCount = 0;
    words.forEach(word => {
      const wordLower = word.toLowerCase();
      const vowels = 'aeiouy';
      let count = 0;
      
      for (let i = 0; i < wordLower.length; i++) {
        if (vowels.includes(wordLower[i]) && 
            (i === 0 || !vowels.includes(wordLower[i-1]))) {
          count++;
        }
      }
      
      if (wordLower.endsWith('e') && count > 1) {
        count--;
      }
      
      syllableCount += count || 1;
    });
    
    const avgSyllablesPerWord = syllableCount / words.length;
    
    // Flesch Reading Ease score (simplified)
    const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    
    let complexity;
    if (fleschScore >= 90) complexity = 'Very Easy';
    else if (fleschScore >= 80) complexity = 'Easy';
    else if (fleschScore >= 70) complexity = 'Fairly Easy';
    else if (fleschScore >= 60) complexity = 'Standard';
    else if (fleschScore >= 50) complexity = 'Fairly Difficult';
    else if (fleschScore >= 30) complexity = 'Difficult';
    else complexity = 'Very Difficult';
    
    return {
      score: Math.round(fleschScore),
      complexity,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10
    };
  }
}

module.exports = new NLPService();