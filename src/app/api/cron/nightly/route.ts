import { NextRequest, NextResponse } from 'next/server';
import { POST as syncZmanim } from '../sync-zmanim/route';
import { POST as commitReminders } from '../commit-reminders/route';

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  return secret && auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  return POST(req);
}

// Vercel's free (Hobby) plan allows only 2 cron jobs, so the two nightly 2 AM
// jobs run here in sequence. Order matters: sync-zmanim creates tomorrow's
// minyanim first, then commit-reminders texts members who haven't committed.
// The individual routes still exist and can be triggered manually.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const zmanim = await (await syncZmanim(req)).json();
  const reminders = await (await commitReminders(req)).json();

  return NextResponse.json({ ok: true, zmanim, reminders });
}
