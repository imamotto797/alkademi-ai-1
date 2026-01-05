# Alkademi AI - Vercel Deployment Guide

## Quick Setup

### 1. Connect to Vercel
1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Paste: `https://github.com/imamotto797/alkademi-ai-1`
4. Click "Import"

### 2. Add Environment Variables
In the Vercel dashboard, add these under "Environment Variables":

```
NEON_DB_URL=postgresql://neondb_owner:npg_zVxWqjDaF2c1@ep-lucky-wildflower-a12uwq0n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

GEMINI_API_KEYS=AIzaSyCyL8cuXqI1qgXF0MRCoxWZsZ4fRNjHB2E,AIzaSyAAgSISheJc23VjEHfZyGcQs9QvYGkUoRo,AIzaSyCyL8cuXqI1qgXF0MRCoxWZsZ4fRNjHB2E

PRIMARY_LLM_PROVIDER=gemini

TRIAL_ACCOUNT=true

PORT=3000
```

### 3. Deploy
Click "Deploy" - Vercel will automatically build and deploy your app from GitHub!

### 4. View Live App
Your app will be available at a URL like:
`https://alkademi-ai.vercel.app` (or your custom domain)

## Benefits
- ✅ Free tier with good resources
- ✅ Automatic deployments on every GitHub push
- ✅ HTTPS out of the box
- ✅ Global CDN
- ✅ No server management

## Future Pushes
Every push to `main` branch automatically triggers a new deployment on Vercel!
