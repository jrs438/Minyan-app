# CLAUDE.md

Instructions for Claude Code working on the CBT Minyan app. Read HANDOFF.md for full project context and decision history.

## Project summary
PWA to fill the daily minyan at Congregation Beth Tefillah (Paramus, NJ). Next.js 14 + Supabase + Stripe + Twilio + Hebcal, deployed on Vercel. Owner is a non-developer; write clear code and explain changes plainly.

## First things to do this session
1. `npm install`
2. `npm run build` and fix every type error before anything else
3. Help set up `.env.local` from `.env.example` (guide the user through each value)

## Priority bugs to fix (details in HANDOFF.md)
1. Timezone: zmanim sync + times editor hardcode `-05:00` (EST), which breaks under daylight saving. Use America/New_York-aware conversion.
2. Streak logic (`src/lib/streaks.ts`) resets on shabbat gaps — treat shabbat as a freebie day.
3. Supabase SSR cookie handling may need updating for the installed `@supabase/ssr` version.
4. Generate PWA icons (`public/icon-192.png`, `public/icon-512.png`).

## Conventions
- TypeScript strict mode is on
- Tailwind for styling; design tokens are in `tailwind.config.js` (ink/cream/gold/parchment palette)
- Server components by default; `'use client'` only where interactivity is needed
- All money stored as integer cents, never floats
- All point logic flows through `points_ledger` for auditability
- Supabase admin client (`supabaseAdmin()`) only in API routes / server — never client
- Service-role key must never reach the browser

## Product rules that must not be violated
- Teens earn points on attendance; adults earn ONLY on rescues (below-threshold attendance)
- Buyouts are not capped; declining shows a soft nudge, never a hard block
- App goes read-only during shabbat/yom tov (Hebcal-detected)
- Members are added by gabbai only — no self-signup
- Mincha and maariv are a single combined service

## Testing approach
- Test login locally with a real phone added to the `members` table
- Use Stripe test mode + card 4242 4242 4242 4242
- Trigger crons manually with: `curl -X POST localhost:3000/api/cron/sync-zmanim -H "Authorization: Bearer $CRON_SECRET"`

## Deployment
Full walkthrough is in README.md. Vercel + Supabase + Stripe + Twilio. Don't skip the human verification steps (Stripe bank, Twilio number).
