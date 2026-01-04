# Multi-API Key Support Setup Guide

## Overview
Your application now supports multiple Gemini API keys with automatic failover and quota tracking. When one key hits quota, it automatically switches to the next available key.

## Configuration

### Adding Multiple Keys to `.env`

In your `.env` file, add multiple keys separated by commas:

```env
GEMINI_API_KEYS="key1_here,key2_here,key3_here"
NEON_DB_URL="your_database_url"
PORT=3000
ENABLE_EMBEDDINGS=true
```

**Example:**
```env
GEMINI_API_KEYS="AIzaSyCyL8cuXqI1qgXF0MRCoxWZsZ4fRNjHB2E,AIzaSyBxxx...,AIzaSyYyyy..."
```

### Getting Multiple API Keys

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Create multiple free accounts OR
3. Create multiple Google Cloud projects and enable Gemini API in each
4. Copy each API key to your `.env` file

## How It Works

### Key Selection Strategy
- The app tries to use keys in order (key 1, then key 2, etc.)
- When a key hits quota, it's marked with a 5-minute cooldown
- After cooldown expires, the key is retried
- If all keys are quota-limited, requests fail gracefully with clear error messages

### Failover Logic
**For LLM Generation:**
1. Try Model 1 (gemini-2.0-flash) with Key 1
2. If Key 1 hits quota → try Key 2, then Key 3, etc.
3. If all keys quota-limited for Model 1 → try Model 2
4. Continue across all model/key combinations

**For Embeddings:**
1. Try each text chunk with current key
2. If key hits quota → automatically switch to next available key
3. Continue processing remaining chunks

## API Endpoints

### Check Key Status
```bash
GET /api/materials/status/keys
```

**Response:**
```json
{
  "totalKeys": 3,
  "currentKeyIndex": 0,
  "keys": {
    "key_1": {
      "maskedKey": "AIzaS...NjHB2E",
      "requestsThisHour": 5,
      "hourlyLimit": 60,
      "percentageUsed": "8.3",
      "quotaExceeded": false,
      "cooldownMinutesRemaining": 0,
      "lastError": null
    },
    "key_2": {
      "maskedKey": "AIzaS...xxxx",
      "requestsThisHour": 45,
      "hourlyLimit": 60,
      "percentageUsed": "75.0",
      "quotaExceeded": false,
      "cooldownMinutesRemaining": 0,
      "lastError": null
    },
    "key_3": {
      "maskedKey": "AIzaS...yyyy",
      "requestsThisHour": 60,
      "hourlyLimit": 60,
      "percentageUsed": "100.0",
      "quotaExceeded": true,
      "cooldownMinutesRemaining": 4,
      "lastError": "[429 Too Many Requests] You exceeded your current quota"
    }
  }
}
```

### Check Overall Quota (Gemini + Neon combined)
```bash
GET /api/materials/status/quota
```

## Quota Limits Per Key

**Free Tier Limits (per key):**
- Requests per minute: 600
- Daily requests: Limited
- Monthly tokens: Limited based on quota
- Embeddings: 100 per minute

**With Multiple Keys:**
- 2 keys = 1200 requests/min combined
- 3 keys = 1800 requests/min combined
- And so on...

## Console Logging

When running with multiple keys, you'll see:

```
🔑 Key 1/3 registered: AIzaS...NjHB2E
🔑 Key 2/3 registered: AIzaS...xxxx
🔑 Key 3/3 registered: AIzaS...yyyy

✅ Generated with gemini-2.0-flash (API Key available)

⏭️  Key 1 still in cooldown (quota), trying next...
✅ Generated with Key 2 successfully

❌ Key 3 (AIzaS...yyyy) marked as quota-limited. Cooldown: 5 minutes
```

## Error Handling

**When all keys are quota-limited:**
```
Error: No available API keys. All keys are quota-limited.
```

**Solution:** Wait 5 minutes for cooldown to expire, or add more API keys.

## Best Practices

1. **Monitor key usage** - Check `/api/materials/status/keys` regularly
2. **Add buffer keys** - Keep 1-2 extra keys for unexpected spikes
3. **Use free tier efficiently** - Each free key gives 600 req/min
4. **Plan for scale** - For production: upgrade to paid tier or use many keys
5. **Rotate keys** - Periodically update keys in case of exposure

## Testing Multi-Key Setup

### Test with 3 Keys:
```env
GEMINI_API_KEYS="key1,key2,key3"
```

Upload files and watch console logs show key switching when quotas hit.

### Check Key Status in Frontend:
Open browser console and run:
```javascript
fetch('/api/materials/status/keys')
  .then(r => r.json())
  .then(data => console.log(data))
```

## Troubleshooting

**"No GEMINI_API_KEYS found in environment"**
- Ensure `.env` has `GEMINI_API_KEYS` (with 'S') not `GEMINI_API_KEY`
- Restart the server after changing `.env`

**All keys showing quota-exceeded**
- Keys might still be in cooldown period
- Check console for cooldown countdown
- Wait 5 minutes for automatic retry

**Keys not switching**
- Check that keys are different (not duplicates)
- Verify `.env` format: comma-separated, no spaces between keys
- Check logs for which key is currently active

## Future Enhancements

Potential improvements:
- Per-key request queuing to prevent overload
- Automatic key rotation based on time-of-day
- Database storage of key metrics for analytics
- Frontend dashboard showing real-time key usage graphs
- Webhook alerts when all keys hit quota
