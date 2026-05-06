# Vercel Deployment Guide - Environment Variables

## Critical: Set These Environment Variables in Vercel

The application requires Supabase credentials to be set in Vercel project settings. Without these, the app will fail to authenticate users and fetch data.

### Step-by-Step Setup

1. **Go to Vercel Project Settings**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `showroom-management`
   - Go to: **Settings → Environment Variables**

2. **Add These Variables**

   | Variable Name | Value | Notes |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://ievdekuapysvmiuiadum.supabase.co` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | (Your full anon key) | Get from Supabase Settings → API |

3. **Where to Find Supabase Credentials**
   - Go to https://app.supabase.com
   - Select your project
   - Settings → API
   - Copy the "Project URL"
   - Copy the "anon public" key

4. **Important Notes**
   - These variables MUST have the `VITE_` prefix to be available in frontend code
   - Vercel needs to rebuild after env vars are added
   - The app includes fallback values but they may be outdated

### After Adding Environment Variables

1. **Trigger a Rebuild**
   - In Vercel dashboard, go to **Deployments**
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger automatic rebuild

2. **Verify the Deployment**
   - Visit your Vercel app URL
   - Open browser DevTools (F12)
   - Check Console for "🔧 Supabase Configuration"
   - Should show that env vars are being used (not fallback values)

---

## Understanding the Errors

### Error: `ERR_NAME_NOT_RESOLVED` on Supabase requests
**Cause:** Supabase URL is wrong or network is unavailable
**Solution:** Verify VITE_SUPABASE_URL is set correctly in Vercel

### Error: `Failed to fetch` / `TypeError: Failed to fetch`
**Cause:** Network error trying to reach Supabase
**Solution:** Check internet connection, verify credentials are correct

### Error: `500 Internal Server Error` on `/api/db/*`
**Cause:** These are phantom calls from browser cache or extensions
**Solution:** Clear browser cache, hard refresh (Ctrl+Shift+R)

### Error: `No active session found`
**Status:** Normal - appears on first page load before auth completes
**No action needed:** Error handling is in place, session will be loaded

---

## Verification Checklist

- [ ] VITE_SUPABASE_URL is set in Vercel
- [ ] VITE_SUPABASE_ANON_KEY is set in Vercel
- [ ] Vercel has redeployed after env vars were added
- [ ] Browser cache is cleared
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Console shows "🔧 Supabase Configuration" on dev
- [ ] Console shows correct URLs being used

---

## Local Development

For local development, these variables can be set in `.env` file:

```
VITE_SUPABASE_URL=https://ievdekuapysvmiuiadum.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

Then restart the dev server with `npm run dev`.

---

## Production Deployment Flow

```
Code → Git Push → GitHub → Vercel Webhook
                              ↓
                        Check Environment Variables
                              ↓
                        Build with: npm run build
                              ↓
                        Output to: dist/
                              ↓
                        Deploy to CDN
                              ↓
                        Available at Vercel URL
```

---

## Contact & Support

If environment variables are set correctly but app still fails:

1. Check Vercel build logs for errors
2. Verify Supabase project is active
3. Check Supabase RLS policies aren't blocking requests
4. Try a manual redeploy in Vercel dashboard

---

## Related Documentation

- [VERCEL_DEPLOYMENT_FIXES.md](VERCEL_DEPLOYMENT_FIXES.md) - Detailed deployment issues
- [PRODUCTION_ISSUES_RESOLUTION.md](PRODUCTION_ISSUES_RESOLUTION.md) - Production error analysis
- [.env.example](.env.example) - Environment variable template
