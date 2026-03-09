# GingerPay — Vercel Deployment

## Deploy in 6 steps

### 1. Push to GitHub
Create a new GitHub repo and push this folder.

### 2. Import to Vercel
Go to https://vercel.com/new → Import your GitHub repo.

### 3. Create Upstash Redis
In Vercel project → Storage → Upstash → Create Redis database.
After creation, go to the Upstash dashboard and copy:
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

### 4. Add environment variables
In Vercel project → Settings → Environment Variables, add:
```
LIPIA_API_KEY              = your_key_from_lipia_dashboard
UPSTASH_REDIS_REST_URL     = https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN   = your_token_here
```

### 5. Redeploy
Vercel → Deployments → Redeploy (so it picks up the new env vars).

### 6. Done ✅
Your app is live. Callback URL is automatic — no config needed.
