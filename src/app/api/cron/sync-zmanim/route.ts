import { NextRequest, NextResponse } from 'next/server';
import { syncSchedule } from '@/lib/zmanim';

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  return secret && auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const results = await syncSchedule();
  return NextResponse.json({ ok: true, scheduled: results.length, sample: results.slice(0, 5) });
}
