# Deployment Guide — The Hive

This document covers deploying The Hive to **Vercel** with a hosted PostgreSQL database and Cloudinary for file storage.

---

## Architecture Overview (Production)

```mermaid
graph LR
    subgraph Vercel
        FE["React Frontend
        (Static Build)"]
        API["Express API
        (Serverless Functions)"]
    end

    subgraph "Hosted PostgreSQL"
        DB["Neon / Supabase
        PostgreSQL 15+"]
    end

    subgraph Cloudinary
        FS["File Storage
        (Receipts)"]
    end

    USER["Browser"] --> FE
    FE --> API
    API --> DB
    API --> FS
```

---

## Prerequisites

- [Vercel account](https://vercel.com/signup) (free tier available)
- [Neon](https://neon.tech) or [Supabase](https://supabase.com) account for hosted PostgreSQL (both have free tiers)
- [Cloudinary account](https://cloudinary.com/users/register_free) (free tier: 25 credits/month)
- Git repository connected to Vercel

---

## Step 1: Set Up Hosted PostgreSQL

### Option A: Neon (Recommended)

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project → choose the **nearest region** to your users
3. Copy the connection string:
   ```
   postgresql://user:password@ep-xxx.region.neon.tech/the_hive?sslmode=require
   ```
4. **Free tier:** 512 MB storage, 1 compute (auto-suspend after 5 min idle)

### Option B: Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to **Settings → Database** → Copy the connection string (use the **pooler** connection for serverless)
3. **Free tier:** 500 MB storage, 2 projects

### Run Migrations on Production DB

```bash
# Set the production DATABASE_URL temporarily
export DATABASE_URL="postgresql://user:password@host/the_hive?sslmode=require"

# Run migrations
cd server
npm run db:migrate
```

> **Important:** Never store the production DATABASE_URL in your local `.env` permanently. Use it only for running migrations, then remove it.

---

## Step 2: Set Up Cloudinary

1. Log in to [Cloudinary Console](https://console.cloudinary.com/)
2. From the Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Create a folder: `the-hive/` for organizing uploads
4. (Optional) Set upload presets for receipt processing

---

## Step 3: Project Structure for Vercel

Vercel deploys the frontend as a static site and the backend as serverless functions. The project needs this structure:

```
the-hive/
├── client/              ← Frontend (built as static site)
│   ├── src/
│   ├── public/
│   ├── vite.config.js
│   └── package.json
├── server/              ← Backend (serverless functions)
│   ├── src/
│   └── package.json
├── api/                 ← Vercel serverless entry point
│   └── index.js         ← Express app wrapped for serverless
├── vercel.json          ← Vercel configuration
└── package.json         ← Root package.json
```

### `api/index.js` — Serverless Entry Point

```javascript
// api/index.js
const app = require('../server/src/app');

module.exports = app;
```

### `vercel.json` — Configuration

```json
{
  "version": 2,
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/index.js"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## Step 4: Configure Vercel Environment Variables

Go to your Vercel project → **Settings → Environment Variables** and add:

### Required Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...?sslmode=require` | Production |
| `JWT_SECRET` | 64+ char random string | Production |
| `JWT_REFRESH_SECRET` | 64+ char random string | Production |
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | Production |
| `CLOUDINARY_API_KEY` | Your API key | Production |
| `CLOUDINARY_API_SECRET` | Your API secret | Production |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Production |
| `NODE_ENV` | `production` | Production |

### Generate Secure Secrets

```bash
# Generate a 64-character random JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Never** reuse secrets across environments. Generate separate secrets for Preview and Production.

---

## Step 5: Deploy

### First Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project (run from project root)
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Automatic Deployments (Recommended)

1. Connect your GitHub repository to Vercel
2. Vercel automatically deploys:
   - **Production** on push to `main`
   - **Preview** on pull request branches
3. Each PR gets its own preview URL for testing

---

## Step 6: Post-Deployment Verification

### Health Check

```bash
# Verify the API is responding
curl https://your-app.vercel.app/api/v1/health

# Expected response:
# { "success": true, "data": { "status": "healthy", "timestamp": "..." } }
```

### Verification Checklist

- [ ] Frontend loads at `https://your-app.vercel.app`
- [ ] API responds at `https://your-app.vercel.app/api/v1/health`
- [ ] Registration flow works (signup → login)
- [ ] Workspace creation works
- [ ] Receipt upload to Cloudinary works
- [ ] OCR extraction runs within timeout (30s Vercel limit)
- [ ] Database connection is stable (SSL enabled)
- [ ] CORS allows only the frontend origin
- [ ] Security headers present (test with [securityheaders.com](https://securityheaders.com))
- [ ] No secrets exposed in client-side bundle

---

## Serverless Considerations

### Cold Starts

- Vercel serverless functions may have **cold starts** (1–3 seconds on first request)
- Tesseract.js initialization takes extra time on cold start (~5 seconds for language data)
- **Mitigation:** Use Vercel's `maxDuration: 30` to allow OCR time; consider initializing Tesseract lazily

### Connection Pooling

- Serverless functions create new DB connections on each invocation
- Use **connection pooling** via Neon's pooler or Supabase's pgBouncer
- Connection string format for pooling:
  ```
  # Neon pooled connection
  postgresql://user:password@ep-xxx-pooler.region.neon.tech/the_hive?sslmode=require
  ```

### Function Size Limits

- Vercel free tier: **50 MB** compressed function size
- Tesseract.js language data may need to be loaded from CDN instead of bundled
- Keep `node_modules` lean — only install production dependencies

---

## Custom Domain (Optional)

1. Go to Vercel project → **Settings → Domains**
2. Add your custom domain (e.g., `app.thehive.io`)
3. Update DNS records as instructed by Vercel
4. Vercel automatically provisions SSL certificates
5. Update `FRONTEND_URL` environment variable to the new domain
6. Update CORS origin in the backend configuration

---

## Monitoring & Logs

### Vercel Dashboard

- **Functions tab:** View invocation count, duration, errors
- **Logs tab:** View real-time function logs (stdout/stderr)
- **Analytics tab:** View page load performance (Web Vitals)

### Application Logging

- All `console.log` / `console.error` from serverless functions appear in Vercel logs
- Use structured logging (JSON) for easier filtering
- Set up log alerts for:
  - 5xx error rate > 1%
  - Function duration > 20 seconds
  - Database connection failures

### External Monitoring (Recommended Post-MVP)

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| [Better Stack](https://betterstack.com) | Uptime monitoring + logs | 10 monitors |
| [Sentry](https://sentry.io) | Error tracking | 5K events/month |
| [Vercel Analytics](https://vercel.com/analytics) | Web Vitals | Included with Pro |

---

## Rollback

If a deployment causes issues:

1. Go to Vercel Dashboard → **Deployments**
2. Find the last working deployment
3. Click **"..." → Promote to Production**
4. The previous version is live immediately

Or via CLI:

```bash
# List recent deployments
vercel ls

# Promote a specific deployment to production
vercel promote <deployment-url>
```

---

## Environment-Specific Configuration

| Setting | Development | Preview | Production |
|---------|------------|---------|------------|
| `NODE_ENV` | `development` | `preview` | `production` |
| Database | Local PostgreSQL | Neon branch DB | Neon main DB |
| Cloudinary folder | `dev/` | `preview/` | `prod/` |
| JWT expiry (access) | 1 hour | 15 minutes | 15 minutes |
| JWT expiry (refresh) | 30 days | 7 days | 7 days |
| Rate limiting | Relaxed | Normal | Strict |
| Error details | Full stack trace | Limited | Generic message only |
| CORS origin | `http://localhost:5173` | Preview URL | Production URL |

---

## Cost Estimates (Free Tier)

| Service | Free Tier Limit | Estimated MVP Usage |
|---------|----------------|-------------------|
| Vercel | 100 GB bandwidth, 100K function invocations | Well within limits |
| Neon PostgreSQL | 512 MB storage, 1 compute | Sufficient for MVP |
| Cloudinary | 25 credits/month (~25 GB) | Sufficient for MVP |
| **Total** | **$0/month** | |

> Free tiers are more than sufficient for MVP. Monitor usage and upgrade individual services as needed.
