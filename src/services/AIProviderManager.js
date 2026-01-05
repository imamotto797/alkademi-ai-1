/**
 * AIProviderManager - Unified interface for multiple AI providers
 * Supports: Gemini, OpenAI, Anthropic Claude
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const quotaService = require('./QuotaService');

class AIProviderManager {
  constructor() {
    this.providers = {};
    // Prioritize Gemini for trial account with limited credits
    this.primaryProvider = (process.env.PRIMARY_LLM_PROVIDER || 'gemini').toLowerCase();
    this.isTrial = process.env.TRIAL_ACCOUNT === 'true' || true; // Assume trial for credit management
    
    // Initialize available providers
    this.initializeProviders();
  }

  initializeProviders() {
    // Gemini - TIER 1 (Prioritized for trial account)
    const geminiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (geminiKeys.length > 0) {
      this.providers.gemini = {
        name: 'gemini',
        keys: geminiKeys,
        models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
        currentKeyIndex: 0,
        quota: {},
        isAvailable: true,
        tier: 'tier1',
        priority: 1, // Highest priority
        cacheTTL: 120 // Cache results for 2 hours (conserve credits)
      };
      console.log(`✅ Gemini provider enabled (TIER 1 - Prioritized) with ${geminiKeys.length} key(s)`);
    }

    // OpenAI
    const openaiKeys = (process.env.OPENAI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (openaiKeys.length > 0) {
      this.providers.openai = {
        name: 'openai',
        keys: openaiKeys,
        models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
        currentKeyIndex: 0,
        quota: {},
        isAvailable: true,
        baseUrl: null // default OpenAI endpoint
      };
      console.log(`✅ OpenAI provider enabled with ${openaiKeys.length} key(s)`);
    }

    // NVIDIA (OpenAI-compatible)
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const nvidiaBaseUrl = process.env.NVIDIA_API_BASE_URL;
    if (nvidiaKey && nvidiaBaseUrl) {
      this.providers.nvidia = {
        name: 'nvidia',
        keys: [nvidiaKey],
        models: ['moonshotai/kimi-k2-instruct-0905'],
        currentKeyIndex: 0,
        quota: {},
        isAvailable: true,
        baseUrl: nvidiaBaseUrl
      };
      console.log('✅ NVIDIA provider enabled (OpenAI-compatible endpoint)');
    }

    // Anthropic Claude
    const claudeKeys = (process.env.ANTHROPIC_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (claudeKeys.length > 0) {
      this.providers.anthropic = {
        name: 'anthropic',
        keys: claudeKeys,
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        currentKeyIndex: 0,
        quota: {},
        isAvailable: true
      };
      console.log(`✅ Anthropic Claude provider enabled with ${claudeKeys.length} key(s)`);
    }

    // DeepSeek (OpenAI-compatible)
    const deepseekKeys = (process.env.DEEPSEEK_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    const deepseekBaseUrl = process.env.DEEPSEEK_API_BASE_URL;
    if (deepseekKeys.length > 0 && deepseekBaseUrl) {
      this.providers.deepseek = {
        name: 'deepseek',
        keys: deepseekKeys,
        models: ['deepseek-chat', 'deepseek-coder'],
        currentKeyIndex: 0,
        quota: {},
        isAvailable: true,
        baseUrl: deepseekBaseUrl
      };
      console.log(`✅ DeepSeek provider enabled with ${deepseekKeys.length} key(s) (OpenAI-compatible)`);
    }

    // Qwen (OpenAI-compatible)
    const qwenKeys = (process.env.QWEN_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    const qwenBaseUrl = process.env.QWEN_API_BASE_URL;
    if (qwenKeys.length > 0 && qwenBaseUrl) {
      this.providers.qwen = {
        name: 'qwen',
        keys: qwenKeys,
        models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
        currentKeyIndex: 0,
        quota: {},
        isAvailable: true,
        baseUrl: qwenBaseUrl
      };
      console.log(`✅ Qwen provider enabled with ${qwenKeys.length} key(s) (OpenAI-compatible)`);
    }

    console.log(`📌 Primary LLM provider: ${this.primaryProvider.toUpperCase()}`);

    if (Object.keys(this.providers).length === 0) {
      console.warn('⚠️ No LLM providers configured! Add API keys to .env');
    }
  }

  /**
   * Get next available provider (with failover)
   */
  getAvailableProvider() {
    // Try primary provider first
    if (this.providers[this.primaryProvider]?.isAvailable) {
      return this.primaryProvider;
    }

    // Fall back to any available provider
    for (const [name, provider] of Object.entries(this.providers)) {
      if (provider.isAvailable) {
        console.log(`⏭️  Primary provider unavailable, using ${name.toUpperCase()}`);
        return name;
      }
    }

    return null;
  }

  /**
   * Get next available API key for a provider
   */
  getNextKey(providerName) {
    const provider = this.providers[providerName];
    if (!provider) return null;

    const keys = provider.keys;
    if (keys.length === 0) return null;

    const key = keys[provider.currentKeyIndex % keys.length];
    provider.currentKeyIndex = (provider.currentKeyIndex + 1) % keys.length;
    return key;
  }

  /**
   * Call Gemini API
   */
  async callGemini(prompt, modelName = 'gemini-2.0-flash') {
    const key = this.getNextKey('gemini');
    if (!key) throw new Error('No Gemini API keys available');

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return await result.response.text();
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('quota')) {
        console.warn(`❌ Gemini key quota exceeded`);
        throw new Error(`Gemini quota exceeded: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, modelName = 'gpt-3.5-turbo', providerName = 'openai') {
    // providerName: 'openai', 'nvidia', 'deepseek', or 'qwen'
    const key = this.getNextKey(providerName);
    const providerDisplayName = {
      openai: 'OpenAI',
      nvidia: 'NVIDIA',
      deepseek: 'DeepSeek',
      qwen: 'Qwen'
    }[providerName] || providerName;
    if (!key) throw new Error(`No ${providerDisplayName} API keys available`);

    try {
      const OpenAI = require('openai').default;
      // Use NVIDIA endpoint if providerName is 'nvidia'
      const baseUrl = (this.providers[providerName] && this.providers[providerName].baseUrl) || undefined;
      const client = new OpenAI({ apiKey: key, baseURL: baseUrl });

      const response = await client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator specializing in creating high-quality teaching materials.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096
      });

      // NVIDIA returns streaming, but for compatibility, handle both
      if (response.choices && response.choices[0].message && response.choices[0].message.content) {
        return response.choices[0].message.content;
      } else if (response.choices && response.choices[0].delta && response.choices[0].delta.content) {
        return response.choices[0].delta.content;
      }
      return '';
    } catch (error) {
      if (error.status === 429 || error.message.includes('rate_limit')) {
        const providerDisplayName = {
          openai: 'OpenAI',
          nvidia: 'NVIDIA',
          deepseek: 'DeepSeek',
          qwen: 'Qwen'
        }[providerName] || providerName;
        console.warn(`❌ ${providerDisplayName} key quota exceeded`);
        throw new Error(`${providerDisplayName} rate limit exceeded: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Call Anthropic Claude API
   */
  async callClaude(prompt, modelName = 'claude-3-opus-20240229') {
    const key = this.getNextKey('anthropic');
    if (!key) throw new Error('No Anthropic API keys available');

    try {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({ apiKey: key });

      const response = await client.messages.create({
        model: modelName,
        max_tokens: 4096,
        system: 'You are an expert educator specializing in creating high-quality teaching materials.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      if (error.status === 429 || error.message.includes('rate_limit')) {
        console.warn(`❌ Claude key quota exceeded`);
        throw new Error(`Anthropic rate limit exceeded: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Universal generate method - tries providers in order
   */
  async generate(prompt, preferredProvider = null, preferredModel = null) {
    const providers = [];

    // Add preferred provider first
    if (preferredProvider && this.providers[preferredProvider]) {
      providers.push(preferredProvider);
    }

    // Add primary provider
    if (this.providers[this.primaryProvider]) {
      providers.push(this.primaryProvider);
    }

    // Add remaining providers
    Object.keys(this.providers).forEach(name => {
      if (!providers.includes(name)) {
        providers.push(name);
      }
    });

    for (const provider of providers) {
      try {
        console.log(`Trying ${provider.toUpperCase()}...`);
        let response;

        switch (provider) {
          case 'gemini': {
            const geminiModel = preferredModel && preferredModel.startsWith('gemini') 
              ? preferredModel 
              : this.providers.gemini.models[0];
            response = await this.callGemini(prompt, geminiModel);
            break;
          }
          case 'openai': {
            const openaiModel = preferredModel && (preferredModel.startsWith('gpt') || preferredModel.startsWith('o1'))
              ? preferredModel 
              : this.providers.openai.models[0];
            response = await this.callOpenAI(prompt, openaiModel, 'openai');
            break;
          }
          case 'nvidia': {
            const nvidiaModel = preferredModel && preferredModel.startsWith('moonshotai')
              ? preferredModel
              : this.providers.nvidia.models[0];
            response = await this.callOpenAI(prompt, nvidiaModel, 'nvidia');
            break;
          }
          case 'anthropic': {
            const claudeModel = preferredModel && preferredModel.startsWith('claude')
              ? preferredModel
              : this.providers.anthropic.models[0];
            response = await this.callClaude(prompt, claudeModel);
            break;
          }
          case 'deepseek': {
            const deepseekModel = preferredModel && preferredModel.startsWith('deepseek')
              ? preferredModel
              : this.providers.deepseek.models[0];
            response = await this.callOpenAI(prompt, deepseekModel, 'deepseek');
            break;
          }
          case 'qwen': {
            const qwenModel = preferredModel && preferredModel.startsWith('qwen')
              ? preferredModel
              : this.providers.qwen.models[0];
            response = await this.callOpenAI(prompt, qwenModel, 'qwen');
            break;
          }
          default:
            continue;
        }

        console.log(`✅ Generated with ${provider.toUpperCase()} (${preferredModel || 'default model'})`);
        
        // Track successful request
        quotaService.trackRequest(provider, response.length, true, null);
        
        return response;
      } catch (error) {
        console.warn(`⚠️ ${provider.toUpperCase()} failed: ${error.message}`);
        
        // Track failed request
        quotaService.trackRequest(provider, 0, false, error.message);
        
        continue;
      }
    }

    throw new Error('All AI providers exhausted. Please check your API keys and quotas.');
  }

  /**
   * Get provider status
   */
  getStatus() {
    const status = {};
    for (const [name, provider] of Object.entries(this.providers)) {
      status[name] = {
        available: provider.isAvailable,
        keysConfigured: provider.keys.length,
        models: provider.models,
        isPrimary: name === this.primaryProvider
      };
    }
    return status;
  }

  /**
   * Get all available models across providers
   */
  getAvailableModels() {
    const models = {};
    for (const [name, provider] of Object.entries(this.providers)) {
      models[name] = provider.models;
    }
    return models;
  }
}

module.exports = new AIProviderManager();
