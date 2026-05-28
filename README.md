# CBT Minyan — Build & Deployment Guide

A companion app for Congregation Beth Tefillah's daily minyan. Built as a PWA (installs to the home screen on iOS/Android without the App Store).

---

## What this app does

- Members commit yes/no/maybe to tomorrow's minyan from their phone
- Teens earn points for attendance, compete on a live leaderboard, and win monthly prizes
- Adults are recognized but rewarded only for "rescues" (showing up when the minyan is short)
- Anyone can sponsor a minyan in memory/honor/etc, with payment via Stripe
- Yahrzeit prompts go out 7 days before a loved one's date
- Gabbai console has a "red alert" button that SMS-blasts opted-in members when a minyan is short
- Shabbat/yom tov auto-detected: the app goes read-only from candle-lighting through havdalah
- Zmanim sync nightly from Hebcal so minyan times stay accurate year-round

---

## What you need before you start

Set aside a full Sunday for setup. Don't try to do this in 20-minute chunks between things — the accounts have verification steps that take time and attention.

- A computer with internet
- The shul's legal name, address, EIN (for Stripe)
- Access to the shul's bank account (for Stripe payouts) — or the treasurer on call
- A credit card (Vercel & Twilio need one on file; free tiers won't actually charge you at this scale)
- A phone that can receive SMS (for testing login)
- 2–3 hours of uninterrupted time

---

## Step-by-step deployment

### 1. Create the accounts (~45 min)

Do these in order. Each one unlocks the next.

**A. GitHub** — https://github.com/signup
- Free tier is fine. Needed to hold the code and deploy to Vercel.

**B. Supabase** — https://supabase.com/dashboard
- Click "New Project". Name it `cbt-minyan`. Pick a region (US East — N. Virginia is closest to Paramus).
- Set a database password (save it in a password manager — you won't see it again).
- Wait ~3 min for the project to spin up.

**C. Vercel** — https://vercel.com/signup
- Sign up with your GitHub account.
- No project yet — we'll come back to this.

**D. Stripe** — https://dashboard.stripe.com/register
- Have the shul's treasurer do this, OR do it yourself but assign it to the shul.
- Use the shul's legal name and EIN. For tax-deductibility this must be under the shul's 501(c)(3).
- Connect the shul's bank account. Bank verification takes 1–2 business days.
- Start in **test mode** for development. Flip to live mode only when going to production.

**E. Twilio** — https://www.twilio.com/try-twilio
- Sign up. Buy a phone number (~$1/month). US local number, SMS-enabled.
- Take note: Account SID, Auth Token, and the phone number you bought.

**F. Domain** — you said you have one. If pointing `minyan.cbtparamus.org`, you'll configure DNS in step 7.

### 2. Set up the database (~15 min)

1. In Supabase dashboard, open your project → **SQL Editor** → **New query**
2. Open the file `supabase/schema.sql` from this codebase
3. Copy the **entire** contents and paste into the SQL Editor
4. Click **Run**. You should see "Success. No rows returned."
5. Go to **Table Editor** and verify you see: members, minyan_types, minyanim, commitments, attendance, etc.

**Enable phone auth:**
1. Supabase dashboard → **Authentication** → **Providers** → **Phone**
2. Toggle **Enable phone sign-ups**
3. Under **SMS Provider**, pick **Twilio**
4. Enter your Twilio Account SID, Auth Token, and the phone number you bought
5. Save

**Add yourself as the first member:**
1. Table Editor → `members` → Insert row
2. phone: `+12015551234` (your real cell, with country code)
3. first_name: your first name
4. last_name: your last name
5. role: `admin`
6. active: true
7. Leave `auth_user_id` blank — it'll link itself on first login
8. Save

### 3. Clone and configure the code (~10 min)

On your computer, in a terminal:

```bash
# Extract the tarball
tar -xzf cbt-minyan-part2.tar.gz
cd cbt-minyan

# Install dependencies
npm install

# Copy the env template
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill in:

**From Supabase** (Dashboard → Project Settings → API):
- `NEXT_PUBLIC_SUPABASE_URL` — the "Project URL"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon public` key
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role secret` key (keep this VERY private)

**From Stripe** (Dashboard → Developers → API keys, TEST MODE):
- `STRIPE_SECRET_KEY` — the `sk_test_...` secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — the `pk_test_...` publishable key
- `STRIPE_WEBHOOK_SECRET` — leave blank for now, we'll get it in step 6

**From Twilio** (Dashboard → Account Info):
- `TWILIO_ACCOUNT_SID` — starts with `AC`
- `TWILIO_AUTH_TOKEN` — the auth token
- `TWILIO_FROM_NUMBER` — the phone number you bought, with `+1` prefix

**Generate a cron secret:**
```bash
openssl rand -hex 32
```
Copy the output into `CRON_SECRET=`.

**Set the app URL** (for now, use localhost):
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### 4. Run it locally (~5 min)

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. You should see the login screen.

Enter your phone number (the one you added to the members table). You should receive an SMS code. Enter it. You should land on the home screen, showing "No upcoming minyanim."

**If it fails:**
- No SMS: check Twilio logs (Dashboard → Monitor → Logs), verify phone auth is enabled in Supabase
- Login succeeds but redirects to login again: check that your phone in the members table matches exactly (with `+1` prefix)
- Database errors: go back to Supabase SQL Editor and re-run schema.sql

### 5. Seed some data (~10 min)

Since zmanim haven't synced yet, there are no minyanim to commit to. Two ways to get data:

**Option A** (manual) — In Supabase Table Editor → `minyanim`, insert 3–5 rows for tomorrow:
- service_date: `2026-04-20` (tomorrow's date)
- minyan_type: `shacharit`
- start_time: `2026-04-20T10:30:00Z` (6:30 AM EST in UTC)
- display_time: `6:30 AM`
- threshold: 10

**Option B** (automatic) — Trigger the zmanim sync:
```bash
curl -X POST http://localhost:3000/api/cron/sync-zmanim \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 6. Deploy to Vercel (~20 min)

1. Push the code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/cbt-minyan.git
git push -u origin main
```

2. On Vercel dashboard:
   - Click **Add New → Project**
   - Import your GitHub repo
   - Vercel auto-detects Next.js. Leave build settings as default.
   - Before clicking Deploy, click **Environment Variables** and paste everything from your `.env.local` (EXCEPT — do not paste `NEXT_PUBLIC_APP_URL` yet; we'll fix it below).
   - Click **Deploy**. Takes ~2 min.

3. After deploy succeeds, Vercel shows a URL like `cbt-minyan-xyz.vercel.app`. Copy it.

4. Update environment variables:
   - Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_APP_URL` = the Vercel URL (or your custom domain once set)
   - Redeploy (Deployments → ••• → Redeploy)

**Set up the Stripe webhook:**
1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. Endpoint URL: `https://YOUR-VERCEL-URL.vercel.app/api/stripe/webhook`
3. Events to listen to: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
4. Click **Add endpoint**
5. Click the newly-created endpoint. Reveal the **Signing secret** (`whsec_...`)
6. Back in Vercel → Environment Variables → add `STRIPE_WEBHOOK_SECRET` with that value
7. Redeploy.

### 7. Connect your domain (~15 min)

1. Vercel project → **Domains** → Add `minyan.cbtparamus.org`
2. Vercel gives you a DNS record to add (usually a CNAME pointing to `cname.vercel-dns.com`)
3. Go to your domain registrar (wherever `cbtparamus.org` is registered) and add that CNAME
4. Wait 5–60 min for DNS to propagate
5. Vercel auto-provisions an SSL certificate

Update `NEXT_PUBLIC_APP_URL` in Vercel to `https://minyan.cbtparamus.org` and redeploy.

### 8. Test the full flow

- Sign in with your phone
- Add 2–3 test members (as admin, via `/gabbai/members`)
- Make one of them a "teen"
- Sign in as that teen (separate browser/device)
- Commit to a minyan
- Check in
- Verify the point appears on the leaderboard
- Make a $5 sponsorship (test mode — use card `4242 4242 4242 4242`)
- Verify the pool balance updates

### 9. Go live with Stripe

When ready:
1. Stripe dashboard → toggle to **live mode**
2. Activate your account (they'll ask for business details, bank info)
3. Generate new live API keys
4. Update Vercel environment variables with live keys
5. Update the webhook endpoint to use the live signing secret
6. Redeploy

---

## What to do in week 1 of use

**Day 1-3 (soft launch):**
- Invite 10 regulars + 2-3 teens + the gabbai
- Send them the URL and tell them to install it to their home screen
- Pre-populate minyan times for the next 2 weeks
- Manually seed a few commitments so empty doesn't feel empty

**Day 4-7:**
- Watch the Vercel logs for errors
- Check Supabase → Database → Logs
- Tune minyan times if anything is off
- Fix anything that confuses people

**Week 2:**
- Rabbi announces from the bima
- Send shul-wide email with the URL and a QR code

---

## Common operations

**Add a member** — /gabbai/members, click "+ Add Member"
**Fix a minyan time** — /gabbai/times
**See who's coming tomorrow** — /gabbai (home)
**Send a red alert** — /gabbai, tap the red card
**Record a yahrzeit** — Supabase table editor → `yahrzeits` (v2 will have a UI)
**Adjust point values** — /gabbai/economy
**Monthly wrap-up** — /gabbai/wrapup (take this list to your treasurer)

---

## File map (for anyone extending this)

```
supabase/schema.sql              — full database schema + RLS policies
src/app/
  page.tsx                       — root, routes to login or home
  layout.tsx                     — global shell, fonts, SW registration
  globals.css                    — design tokens via Tailwind
  auth/login/page.tsx            — phone entry
  auth/verify/page.tsx           — SMS code entry
  home/page.tsx                  — member/teen home (role-aware)
  commit/[id]/page.tsx           — yes/no/maybe flow
  checkin/page.tsx               — self-check-in
  leaderboard/page.tsx           — teens + adult recognition
  rides/page.tsx                 — ride board
  sponsor/page.tsx               — sponsor entry
  sponsor/thanks/page.tsx        — post-Stripe confirmation
  yahrzeit/[id]/page.tsx         — yahrzeit prompt landing
  profile/page.tsx               — user settings
  gabbai/page.tsx                — admin console
  gabbai/members/page.tsx        — member CRUD
  gabbai/times/page.tsx          — minyan time override
  gabbai/wrapup/page.tsx         — monthly payout suggestions
  gabbai/economy/page.tsx        — reward config editor
  api/checkin                    — member self check-in
  api/redalert                   — SMS blast to opted-in members
  api/stripe/checkout            — creates Stripe session
  api/stripe/webhook             — updates pool on payment
  api/gabbai/checkin             — gabbai proxies a check-in
  api/cron/sync-zmanim           — nightly Hebcal sync (2 AM)
  api/cron/commit-reminders      — nightly commit reminders (2 AM)
  api/cron/yahrzeit-prompts      — daily yahrzeit scan (1 PM)
src/components/                  — all UI components
src/lib/
  supabase.ts                    — client factories + getCurrentMember
  types.ts                       — TypeScript models
  shabbat.ts                     — shabbat/yom tov detection
  streaks.ts                     — streak computation + bonuses
vercel.json                      — cron schedule
```

---

## Known limitations / things to add in v2

- No OneSignal push — only SMS. Push is more reliable on locked phones; worth adding.
- No gift card automation — winners get cards manually each month.
- No ShulCloud sync — sponsorships don't flow to member giving statements yet.
- Yahrzeits require manual entry in the yahrzeits table — no ShulCloud sync yet.
- No offline support — the app needs a network connection.
- The streak calculation is naive — doesn't handle shabbat gaps properly. A teen who misses shabbat (correctly!) will see their streak reset. Acceptable for v1; fix in v2 by treating shabbat as a "freebie" day.
- The "rescue" detection in check-in is a simple threshold check; it can fire incorrectly if many people check in nearly simultaneously when the minyan was short. Acceptable for v1.
- No refund flow — gabbai handles refunds manually in Stripe dashboard.

---

## When something breaks

1. **Check Vercel deployment logs** (Deployments → most recent → Function Logs)
2. **Check Supabase logs** (Project → Logs → API/Postgres)
3. **Check Twilio logs** (Monitor → Logs → Messages) for SMS issues
4. **Check Stripe logs** (Developers → Events) for payment issues
5. If still stuck: come back to Claude with the error message and a link to the relevant code file

---

## Budget in practice

- **Vercel**: Free Hobby tier handles this easily (~100 GB bandwidth, ~100k function invocations/month). You'll use maybe 2% of that.
- **Supabase**: Free tier is 500MB database, 50k monthly active users. You're nowhere near limits.
- **Stripe**: 2.9% + $0.30 per transaction. On $3,500 in sponsorships: ~$110 in fees.
- **Twilio**: $1/month phone number + ~$0.01 per SMS. At 100 SMS/month: ~$2/month total.
- **Domain**: $12-15/year if you already have `cbtparamus.org`, the subdomain is free.

**Total monthly cost at steady state: ~$5-10/month** once you're past Stripe's verification.

---

Build well. Shkoyach.
