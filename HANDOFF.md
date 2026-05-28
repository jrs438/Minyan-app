# CBT Minyan App — Project Handoff

This document is the full context for continuing the CBT Minyan app build in Claude Code. Read it first.

---

## What this is

A companion app for Congregation Beth Tefillah (modern orthodox shul in Paramus, NJ) to help fill the daily minyan (10 men) for shacharit and mincha/maariv. Core idea: reduce uncertainty about who's coming, and incentivize teen attendance with a rewards pool funded by sponsorships.

Built as a **PWA** (web app that installs to the home screen — no App Store). The owner ("Jeremy") is a non-developer in insurance consulting; he wanted Claude to do most of the build and is comfortable returning for changes. He explicitly chose custom code over a no-code tool (Glide) for speed, accepting the maintenance tradeoff.

## Tech stack (already chosen and scaffolded)

- **Next.js 14** (App Router) + TypeScript + Tailwind — frontend PWA
- **Supabase** (Postgres + auth + RLS) — database & phone/SMS login
- **Stripe Checkout** — sponsorship payments (hosted checkout)
- **Twilio** — red-alert SMS + powers Supabase phone auth
- **Hebcal API** — zmanim sync + shabbat/yom tov detection (no auth needed)
- **Vercel** — hosting + cron jobs
- Push notifications via OneSignal — NOT yet built (v2)

## Product decisions made (don't re-litigate these without asking)

1. **User base v1**: all minyan-eligible men (~50-100), with teens as the priority incentive target.
2. **Mincha and maariv are combined** into a single "Mincha/Maariv" service. Only two service types: `shacharit` and `mincha_maariv`.
3. **Teens earn points** on every attendance; **adults earn points ONLY for "rescues"** (showing up when minyan is below threshold). Adults get recognition (honor roll, streak callouts) but not routine rewards.
4. **Rewards are front-loaded** — bigger prizes early to kickstart habit. Launch month: $200/$75/$50 for top 3 teens, plus $100 for any 30-day streak. Quarterly $300 champion.
5. **Sponsorship framing**: both "dedicate to a specific date" (primary, emotional — yahrzeit/memory/honor/refuah) and "contribute to pool" (secondary). Buyouts are NOT capped (owner's explicit choice). A soft nudge appears when declining a below-threshold minyan, but never a hard block.
6. **Yahrzeit prompts**: 7 days before a yahrzeit, the family member gets an SMS prompting them to sponsor that minyan. This is the sponsorship "flywheel."
7. **Point economy is configurable** in a gabbai admin screen. Default: 1 point = $0.25, 8 pts/minyan, +4 for sponsored minyan, 40 for adult rescue.
8. **Shabbat/yom tov**: app auto-detects via Hebcal and goes read-only (no notifications, no commits) from candle-lighting through havdalah.
9. **Login**: phone number + SMS code (no passwords). Members must be pre-added by a gabbai; no self-signup.
10. **Roles**: member, teen, gabbai, admin. Gabbai/admin see an admin console.

## Items the owner must confirm with the rav before launch
- Buyout/sponsorship language (some rabbis prefer giving-forward framing over "pay to skip")
- Whether cash/Amazon prizes for teens are appropriate vs. shul credit
- Whether public teen leaderboards are appropriate
- Yahrzeit prompt wording/tone
- General blessing on the concept

## Current state of the code

**Complete and written (NOT yet tested with npm install / build):**
- Full DB schema with RLS (`supabase/schema.sql`)
- Phone/SMS auth (login + verify pages)
- Home (member + teen variants, role-aware, streak-aware)
- Commit flow (yes/no/maybe + soft nudge)
- Check-in (self + gabbai proxy) with atomic point awarding
- Leaderboard (teen competition + adult recognition)
- Rides board
- Sponsor flow + Stripe checkout + webhook + thank-you page
- Yahrzeit prompt page
- Gabbai console: dashboard, member CRUD, times editor, monthly wrap-up, economy config
- Cron jobs: zmanim sync, commit reminders, yahrzeit prompts (Vercel cron, GET+POST handlers)
- Shabbat detection, streak computation
- PWA manifest + service worker
- Full README with step-by-step deployment guide

## KNOWN ISSUES TO FIX FIRST in Claude Code

These are the highest-priority things to address when you open the project:

1. **Never run `npm install` or `npm run build`** was possible in the original environment — so there are certainly type errors and possibly dependency version mismatches. RUN THESE FIRST and fix what surfaces.
2. **Supabase SSR API** (`@supabase/ssr`) evolves; the `cookies()` handling in `src/lib/supabase.ts` may need adjustment for the installed version.
3. **`computeStreak` is naive** — it resets on shabbat gaps. A teen who (correctly) skips shabbat shouldn't lose their streak. Treat shabbat as a "freebie."
4. **"Rescue" detection** in check-in routes is a simplistic threshold check that can misfire when many people check in at once. Acceptable for v1 but flag for improvement.
5. **No PNG icons** exist for the PWA manifest (`/icon-192.png`, `/icon-512.png`) — need to be created.
6. **Stripe API version** is pinned with `as any` cast — verify against installed stripe package version.
7. **No OneSignal push** — only SMS. Push is more reliable; consider adding.
8. **Timezone handling** in the zmanim sync and times editor hardcodes EST offset (`-05:00`) — breaks during EDT (daylight saving). NEEDS FIXING — use a proper tz library or America/New_York-aware conversion.

## Suggested first session in Claude Code

```
1. npm install
2. npm run build   → fix all type errors
3. Set up .env.local from .env.example (see README)
4. Create a Supabase project, run schema.sql
5. npm run dev → test login locally
6. Fix the timezone bug (#8 above) — it's the most likely to cause real confusion
7. Fix the streak/shabbat bug (#3)
8. Generate PWA icons
9. Then deploy per README
```

## File map

See README.md "File map" section for the full structure. Key directories:
- `supabase/schema.sql` — paste into Supabase SQL editor
- `src/app/` — pages and API routes
- `src/components/` — UI components
- `src/lib/` — supabase clients, types, shabbat logic, streak logic

## Design language

Parchment/cream backgrounds, deep navy ink, warm gold accents. Cormorant Garamond serif for display, Inter for body, JetBrains Mono for data labels. Reverent but modern — not a gamified fitness-app look, even though it has gamification. Reference: the mockup HTML file (`minyan_mockups.html`) shows all ten screens with this language applied.

## What success looks like for v1

Soft launch to 10-15 regulars + a few teens + the gabbai. Seed real minyan times. The app should make tomorrow's count visible, let people commit in under 10 seconds, and let someone sponsor a yahrzeit minyan. Everything else is secondary.
