# Multi-Provider AI Configuration Guide

## Overview
Your app now supports multiple AI providers with automatic failover:
- **Gemini** (Google) - Fast, free tier available
- **OpenAI** - GPT-4, GPT-3.5
- **Anthropic** - Claude 3 models

## Quick Setup

### 1. Update `.env` File

```env
# Gemini API Keys (comma-separated)
GEMINI_API_KEYS="key1,key2,key3"

# OpenAI API Keys (comma-separated)
OPENAI_API_KEYS="sk-...,sk-..."

# Anthropic Claude API Keys (comma-separated)
ANTHROPIC_API_KEYS="sk-ant-...,sk-ant-..."

# Set which provider to try first
PRIMARY_LLM_PROVIDER="gemini"  # Options: gemini, openai, anthropic

# Database and other settings
NEON_DB_URL="postgresql://..."
PORT=3000
ENABLE_EMBEDDINGS=true
```

## Getting API Keys

### Gemini (Google)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click "Create API Key"
3. Copy the key to `.env`
4. **Free tier:** 60 requests/minute

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy to `.env`
4. **Requires payment setup**

### Anthropic (Claude)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys
3. Create new API key
4. Copy to `.env`
5. **Requires payment setup**

## Configuration Examples

### Use Gemini Only
```env
GEMINI_API_KEYS="AIzaSyCyL8cuXqI1qgXF0MRCoxWZsZ4fRNjHB2E"
OPENAI_API_KEYS=""
ANTHROPIC_API_KEYS=""
PRIMARY_LLM_PROVIDER="gemini"
```

### Use Multiple Gemini Keys
```env
GEMINI_API_KEYS="key1,key2,key3"
OPENAI_API_KEYS=""
ANTHROPIC_API_KEYS=""
PRIMARY_LLM_PROVIDER="gemini"
```

### Hybrid Setup (Gemini Primary, OpenAI Fallback)
```env
GEMINI_API_KEYS="key1,key2"
OPENAI_API_KEYS="sk-...,sk-..."
ANTHROPIC_API_KEYS=""
PRIMARY_LLM_PROVIDER="gemini"
```

### All Providers Available
```env
GEMINI_API_KEYS="key1,key2"
OPENAI_API_KEYS="sk-...,sk-..."
ANTHROPIC_API_KEYS="sk-ant-...,sk-ant-..."
PRIMARY_LLM_PROVIDER="gemini"
```

## Failover Logic

**Generation Process:**
1. Try PRIMARY_LLM_PROVIDER first
2. If it fails or quota exceeded → try next available provider
3. Cycle through all configured providers
4. If all fail → return error with details

**Example with Hybrid Setup:**
```
Attempt 1: Gemini (Key 1) → fails due to quota
Attempt 2: Gemini (Key 2) → still quota limited
Attempt 3: OpenAI (Key 1) → SUCCESS ✅
```

## API Endpoints

### Check Provider Status
```bash
GET /api/materials/status/providers
```

**Response:**
```json
{
  "providers": {
    "gemini": {
      "available": true,
      "keysConfigured": 2,
      "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
      "isPrimary": true
    },
    "openai": {
      "available": true,
      "keysConfigured": 1,
      "models": ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
      "isPrimary": false
    },
    "anthropic": {
      "available": false,
      "keysConfigured": 0,
      "models": [],
      "isPrimary": false
    }
  },
  "availableModels": {
    "gemini": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    "openai": ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
    "anthropic": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
  },
  "primaryProvider": "gemini"
}
```

### Check Quota Status (Gemini-specific)
```bash
GET /api/materials/status/quota
```

### Check Key Status
```bash
GET /api/materials/status/keys
```

## Models Available Per Provider

### Gemini (Google)
- `gemini-2.0-flash` - Fastest, best for education
- `gemini-2.5-flash` - Balanced quality/speed
- `gemini-2.5-pro` - Most capable

### OpenAI
- `gpt-4-turbo` - Most advanced
- `gpt-4` - Previous version
- `gpt-3.5-turbo` - Fastest, cheapest

### Anthropic (Claude)
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fastest

## Pricing Comparison

| Provider | Free Tier | Model | Input Cost | Output Cost |
|----------|-----------|-------|-----------|------------|
| **Gemini** | $300/mo | 2.0-flash | Free (600 RPM limit) | Free |
| **Gemini** | - | 2.0-flash | $0.075/1M tokens | $0.30/1M |
| **OpenAI** | None | GPT-4 Turbo | $0.01/1K tokens | $0.03/1K |
| **OpenAI** | None | GPT-3.5 Turbo | $0.50/1M tokens | $1.50/1M |
| **Anthropic** | None | Claude 3 Opus | $0.015/1K tokens | $0.075/1K |
| **Anthropic** | None | Claude 3 Haiku | $0.25/1M tokens | $1.25/1M |

## Console Logs

### Startup
```
✅ Gemini provider enabled with 2 key(s)
✅ OpenAI provider enabled with 1 key(s)
⚠️ Anthropic provider disabled (no keys)
📌 Primary LLM provider: GEMINI
```

### Generation
```
Trying GEMINI...
❌ Gemini hit quota limit
⏭️  Primary provider unavailable, using OPENAI
Trying OPENAI...
✅ Generated with OPENAI
```

## Troubleshooting

### "No LLM providers configured"
- Check `.env` has at least one provider key
- Restart server: `npm run dev`
- Verify no extra spaces in keys

### "All AI providers exhausted"
- All providers hit quota limits
- Wait a few minutes for quota reset
- Or add more API keys
- Check `/api/materials/status/providers` for details

### Provider not showing as available
- Verify API keys in `.env` are correct
- Check console for initialization errors
- Keys must be comma-separated with no spaces between keys

### Specific provider failing
- Check API key validity in provider console
- Verify account has billing set up (except Gemini free tier)
- Review rate limits for that provider

## Testing

### Test Current Provider
```javascript
// In browser console
fetch('/api/materials/status/providers')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
```

### Test with File Upload
1. Go to http://localhost:3000
2. Upload a PDF or text file
3. Click "Generate"
4. Watch console to see which provider is used

## Best Practices

1. **Set Primary Provider** - Use fastest/cheapest as primary
2. **Multiple Keys** - Use 2-3 keys per provider for redundancy
3. **Monitor Usage** - Check endpoints regularly
4. **Cost Control** - Use OpenAI/Claude only for fallback
5. **Free Tier First** - Gemini free tier is generous

## Emergency Fallback Plan

If your primary provider fails:

1. **Immediate:** App automatically tries next provider
2. **Short-term:** Add another key from same provider
3. **Medium-term:** Upgrade tier or add paid provider
4. **Long-term:** Distribute across multiple providers

## Production Deployment

For production use:

```env
# Use multiple keys per provider for redundancy
GEMINI_API_KEYS="key1,key2,key3"
OPENAI_API_KEYS="sk-key1,sk-key2"
ANTHROPIC_API_KEYS="sk-ant-key1"

# Fallback chain: Gemini → OpenAI → Claude
PRIMARY_LLM_PROVIDER="gemini"
```

This ensures 99.9% availability if any single provider has issues.
