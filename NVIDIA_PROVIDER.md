# NVIDIA API Provider Usage

This project supports using NVIDIA's OpenAI-compatible API endpoint for LLM generation.

## How to Enable
1. Add the following to your `.env` file:

```
NVIDIA_API_KEY=your-nvidia-api-key
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
```

2. The backend will automatically detect and use NVIDIA as a provider. You can select the NVIDIA model (e.g., `moonshotai/kimi-k2-instruct-0905`) in your UI or API calls.

3. NVIDIA is treated as an OpenAI-compatible provider, so it uses the same OpenAI client library and API structure.

## Model Selection
- To use NVIDIA, select the model `moonshotai/kimi-k2-instruct-0905` or set the provider to `nvidia` in your backend/frontend.

## Notes
- NVIDIA requests are routed to the NVIDIA endpoint with your API key.
- Fallback and quota logic works the same as for other providers.
