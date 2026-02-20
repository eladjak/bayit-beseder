# BayitBeSeder - Vercel Deployment Guide

## Pre-Deployment Checklist

✅ **All tasks completed:**
- [x] `vercel.json` configured with framework and cron jobs
- [x] `next.config.ts` configured with Supabase image domains
- [x] `.env.example` complete with all 10 required env vars
- [x] Auth middleware exists with demo mode fallback
- [x] Build passes: `npx next build` ✓
- [x] TypeScript passes: `npx tsc --noEmit` ✓
- [x] 160 tests passing
- [x] Mock data fallback working

## Deployment Steps

### 1. Connect to Vercel
```bash
# Install Vercel CLI (if not already)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### 2. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

**Supabase (3 vars)**
- `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key

**WhatsApp via Green API (3 vars)**
- `GREEN_API_INSTANCE_ID` = Instance ID (shared with Kami)
- `GREEN_API_TOKEN` = API token
- `WHATSAPP_PHONES` = 05x-xxx-xxxx,05y-yyy-yyyy (comma-separated)

**Cron Jobs (1 var)**
- `CRON_SECRET` = Random secret string (use: `openssl rand -hex 32`)

**Web Push VAPID (3 vars)**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Generate with: `node scripts/generate-vapid-keys.mjs`
- `VAPID_PRIVATE_KEY` = From same script
- `VAPID_SUBJECT` = mailto:your-email@example.com

### 3. Verify Deployment

After deployment:
1. Visit the production URL
2. Test demo mode (without login) - should show mock data
3. Test login with Google OAuth
4. Test Supabase data loading (tasks, categories, completions)
5. Check Vercel Cron logs for scheduled jobs

## Cron Jobs (automatically configured)

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/cron/daily-brief` | 08:00 Israel (05:00 UTC) | Morning WhatsApp brief |
| `/api/cron/daily-summary` | 20:00 Israel (17:00 UTC) | Evening WhatsApp summary |
| `/api/cron/auto-schedule` | 01:00 Israel (22:00 UTC) | Auto-generate tasks |

## Troubleshooting

### Build Fails
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check build locally
npx next build
```

### Missing Env Vars
- Check Vercel Dashboard → Settings → Environment Variables
- Verify all 10 vars are set for "Production" environment
- Redeploy after adding vars

### Supabase Connection Issues
- Verify URL/keys are correct
- Check Supabase project is not paused
- App still works in demo mode with mock data

### Cron Jobs Not Running
- Check Vercel Cron logs in Dashboard
- Verify `CRON_SECRET` is set
- Check timezone configuration (UTC in vercel.json)

## Post-Deployment

### Run Supabase Migration
1. Login to Supabase Dashboard
2. Go to SQL Editor
3. Run `supabase/migrations/001_initial_schema.sql`
4. Verify tables created with RLS policies
5. Optional: Run seed script if needed

### Test WhatsApp Integration
```bash
# Test daily brief endpoint
curl -X GET https://your-app.vercel.app/api/cron/daily-brief \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Monitor Usage
- Check Vercel Analytics for traffic
- Monitor Supabase Dashboard for DB usage
- Check Green API Dashboard for WhatsApp message quota

## App URLs

- **Production:** https://bayit-beseder.vercel.app
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Green API Dashboard:** https://console.green-api.com

## Notes

- App works in **demo mode** without authentication (mock data)
- Authentication is optional - users can explore the app first
- WhatsApp notifications require Green API instance (shared with Kami)
- Web Push requires user permission in browser
- All 22 routes are pre-rendered or dynamic (no SSG issues)
