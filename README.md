# GingerPay — Vercel Deployment

## Deploy in 5 steps

### 1. Push to GitHub
Create a new GitHub repo and push this folder.

### 2. Import to Vercel
Go to https://vercel.com/new → Import your GitHub repo.

### 3. Add environment variable
In Vercel project → Settings → Environment Variables:
```
LIPIA_API_KEY = your_key_from_lipia_dashboard
```

### 4. Add Vercel KV storage
In Vercel project → Storage → Create KV Database → Connect to project.
Vercel automatically adds the KV env vars — no extra config needed.

### 5. Deploy
Vercel deploys automatically on every push.
Your callback URL will be: `https://your-project.vercel.app/api/callback`

## How it works
- `/api/pay`      — sends STK push to Lipia
- `/api/callback` — receives Lipia webhook, stores result in Vercel KV
- `/api/result`   — frontend polls this every 3s to check payment status
