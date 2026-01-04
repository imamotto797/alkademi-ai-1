const { GoogleGenerativeAI } = require('@google/generative-ai');
const quotaService = require('./QuotaService');
const keyManager = require('./KeyManager');
const aiProviderManager = require('./AIProviderManager');

// Available models from your API - try in order (fastest to most capable)
const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];

class LLMService {
  // Generate teaching materials based on source content and customization options
  async generateTeachingMaterials(sourceContent, options = {}, relevantContext = []) {
    const {
      targetAudience = 'undergraduate students',
      style = 'academic',
      depth = 'intermediate',
      focusAreas = [],
      length = 'comprehensive',
      generationType = 'learning_materials',
      aiProvider = 'auto',
      aiModel = 'auto'
    } = options;
    
    // Build context from RAG retrieval
    let contextSection = '';
    if (relevantContext.length > 0) {
      contextSection = `\n\nRelevant Context from Knowledge Base:\n`;
      relevantContext.forEach((ctx, idx) => {
        contextSection += `[${idx + 1}] (Similarity: ${(ctx.similarity * 100).toFixed(1)}%) ${ctx.chunk_text}\n\n`;
      });
    }
    
    // Style-specific instructions
    const styleInstructions = {
      'formal': 'Use professional language, formal tone, structured organization, and precise terminology.',
      'casual': 'Use friendly, conversational language with everyday examples and an approachable tone.',
      'storytelling': 'Present concepts through narratives, stories, and scenarios that engage emotionally.',
      'academic': 'Use scholarly language with proper citations format, theoretical frameworks, and research-based approach.'
    };
    
    let prompt = '';
    
    if (generationType === 'learning_planner') {
      // Learning Planner - Activity recommendations similar to NotebookLLM
      prompt = `You are an expert curriculum designer creating a comprehensive learning activity planner.

Source Material:
"""
${sourceContent}
"""
${contextSection}

PLANNER REQUIREMENTS:
- Target Audience: ${targetAudience}
- Teaching Style: ${style} - ${styleInstructions[style]}
- Depth Level: ${depth}
- Focus Areas: ${focusAreas.join(', ') || 'all topics covered in the material'}

CREATE A DETAILED LEARNING ACTIVITY PLANNER IN MARKDOWN:

# Learning Activity Planner

## 📋 Overview
- **Topic**: [Main topic name]
- **Duration**: [Estimated time needed]
- **Target Level**: ${targetAudience}
- **Learning Objectives**: 
  - [Objective 1]
  - [Objective 2]
  - [Objective 3]

## 📚 Pre-Learning Preparation
### For Educators:
- Materials needed
- Room/environment setup
- Pre-assessment activities

### For Students:
- Pre-requisite knowledge
- Pre-reading materials
- Things to prepare

## 🎯 Main Learning Activities

### Activity 1: [Activity Name] (Duration: XX minutes)
**Objective**: [What students will achieve]
**Method**: [How to conduct]
**Materials**: [What's needed]
**Steps**:
1. [Step by step instructions]
2. [Include engagement strategies]
3. [Include assessment checkpoints]

**Expected Outcomes**: [What success looks like]

### Activity 2: [Activity Name]
[Continue with more activities...]

## 💡 Discussion Questions
1. [Thought-provoking question related to the topic]
2. [Question that encourages critical thinking]
3. [Question that connects to real-world applications]

## 🔍 Assessment & Evaluation
- **Formative Assessment**: [Quick checks during learning]
- **Summative Assessment**: [End-of-lesson evaluation]
- **Success Criteria**: [How to measure understanding]

## 🏠 Extension Activities
- **For Fast Learners**: [Advanced challenges]
- **For Additional Practice**: [Reinforcement activities]
- **Real-World Application**: [Practical projects]

## 📝 Reflection & Feedback
- Student self-reflection prompts
- Peer feedback activities
- Educator notes section

Generate a practical, ready-to-use learning activity planner now:`;
    } else if (generationType === 'questions') {
      prompt = `Generate 10-15 thought-provoking questions based on the content for ${targetAudience}. Include a mix of recall, comprehension, application, analysis, and evaluation questions.\n\nContent:\n${sourceContent}${contextSection}`;
    } else if (generationType === 'quiz') {
      prompt = `Create a comprehensive quiz with 10 multiple-choice questions for ${targetAudience}. Include answer key and explanations.\n\nContent:\n${sourceContent}${contextSection}`;
    } else {
      // learning_materials - Comprehensive teaching materials like NotebookLLM
      prompt = `You are an expert educator creating comprehensive, high-quality learning materials similar to NotebookLLM.

Source Content:
"""
${sourceContent}
"""
${contextSection}

MATERIAL SPECIFICATIONS:
- Target Audience: ${targetAudience}
- Teaching Style: ${style} - ${styleInstructions[style]}
- Depth Level: ${depth}
- Focus Areas: ${focusAreas.join(', ') || 'all key concepts in the material'}
- Length: Comprehensive and thorough

CREATE WELL-STRUCTURED LEARNING MATERIALS IN MARKDOWN:

# [Create an Engaging Main Title]

## 📖 Learning Overview
**What You'll Learn:**
- [Learning outcome 1]
- [Learning outcome 2]
- [Learning outcome 3]

**Estimated Time**: [XX minutes]
**Difficulty Level**: ${depth}

---

## 🎯 Introduction
[Write an engaging introduction that connects to ${targetAudience}'s experience]
[Explain why this topic matters]
[Preview what will be covered]

---

## 📚 Core Concepts

### Concept 1: [First Major Topic]
[Comprehensive explanation appropriate for ${targetAudience}]

**Key Points:**
- [Important point 1]
- [Important point 2]

**Real-World Example:**
[Concrete example relevant to the audience]

**Visual Description:**
[Describe a helpful diagram or visualization]

---

### Concept 2: [Second Major Topic]
[Continue with thorough explanations...]

---

## 💡 Practical Applications
[How this knowledge applies in real situations]
[Include 2-3 practical scenarios]

---

## 🔗 Connections & Relationships
[Explain how different concepts relate to each other]
[Show the big picture]

---

## ❓ Common Questions & Misconceptions
**Q: [Common question]**
A: [Clear answer]

**Misconception**: [Common misunderstanding]
**Reality**: [Correct understanding]

---

## ✅ Key Takeaways
1. [Most important point]
2. [Second most important point]
3. [Third most important point]
4. [Practical application]
5. [Connection to broader context]

---

## 🚀 Next Steps
- [Suggested follow-up activity 1]
- [Suggested follow-up activity 2]
- [Resources for deeper learning]

---

## 📝 Self-Check
Test your understanding:
1. [Question to verify understanding]
2. [Question that requires application]
3. [Question that encourages deeper thinking]

IMPORTANT: 
- Adapt language complexity to ${targetAudience}
- Use ${style} style throughout
- Include examples that resonate with ${targetAudience}
- Make it engaging and easy to follow

Generate comprehensive learning materials now:`;
    }
    
    
    // Use unified provider manager with fallback
    try {
      // Check rate limit before making request
      if (quotaService.isRateLimitExceeded()) {
        const error = quotaService.getQuotaErrorMessage('gemini-rate-limit');
        console.warn('⚠️ Rate limit warning:', error.message);
        throw new Error(`Rate limit exceeded. ${error.message}`);
      }

      // Determine preferred provider (null for auto)
      const preferredProvider = aiProvider === 'auto' ? null : aiProvider;
      const preferredModel = aiModel === 'auto' ? null : aiModel;

      const response = await aiProviderManager.generate(prompt, preferredProvider, preferredModel);
      
      // Track successful request
      quotaService.trackGeminiRequest(prompt.length);
      quotaService.logQuotaStatus();
      
      return response;
    } catch (error) {
      // Handle quota-related errors
      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Rate limit')) {
        console.error(`❌ API quota/rate limit exceeded:`, error.message);
        quotaService.logQuotaStatus();
        throw new Error('API quota or rate limit exceeded. Please try again later.');
      }
      
      console.error('Error generating materials:', error);
      throw new Error('Failed to generate teaching materials. Please check your API keys and quota.');
    }
  }

  // Refine existing materials based on feedback
  async refineMaterials(materials, feedback) {
    const prompt = `
      You are an expert educator tasked with refining teaching materials based on feedback.
      
      Current Teaching Materials:
      """
      ${materials}
      """
      
      Feedback:
      """
      ${feedback}
      """
      
      Please revise the teaching materials to address the feedback while maintaining the core educational content.
      Format the output in Markdown.
    `;
    
    try {
      return await aiProviderManager.generate(prompt);
    } catch (error) {
      console.error('Failed to refine materials:', error);
      throw new Error('Failed to refine materials. Please check your API keys and quota.');
    }
  }
}

module.exports = new LLMService();