'use client';
import { useState } from 'react';
import type { UpcomingMinyan } from '@/lib/types';
import { formatServiceDate } from '@/lib/time';

export function GabbaiAlertCard({ minyan }: { minyan: UpcomingMinyan }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    recipients: number;
    queued: number;
    delivered: number;
    failed: number;
    twilio_configured: boolean;
    first_error: string | null;
  } | null>(null);

  const below = minyan.yes_count < minyan.threshold;
  const day = formatServiceDate(minyan.service_date, { weekday: 'short' });
  const typeWord = minyan.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';

  async function sendAlert() {
    setSending(true);
    const res = await fetch('/api/redalert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minyan_id: minyan.id })
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    setResult(data);
  }

  function buttonLabel() {
    if (sending) return 'SENDING…';
    if (!result) return 'SEND RED ALERT →';
    if (!result.twilio_configured) return `⚠ TWILIO NOT SET (${result.recipients} would get it)`;
    if (result.recipients === 0) return `⚠ NO ELIGIBLE RECIPIENTS`;
    if (result.failed > 0) return `⚠ ${result.failed} FAILED OF ${result.recipients}`;
    if (result.delivered > 0) return `✓ DELIVERED TO ${result.delivered} OF ${result.recipients}`;
    return `… QUEUED ${result.queued} OF ${result.recipients} (delivery pending)`;
  }

  if (!below) {
    return (
      <div className="flex justify-between items-center py-3 border-b border-black/5">
        <div>
          <div className="font-serif text-base font-medium text-ink">{day} {typeWord}</div>
          <div className="text-[11px] text-ink-light">{minyan.display_time}</div>
        </div>
        <div className="bg-ok/10 text-ok px-2.5 py-1 rounded-full text-xs font-mono font-semibold">
          {minyan.yes_count} / {minyan.threshold} ✓
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 mb-3 text-cream"
      style={{ background: 'linear-gradient(135deg, #a8372f 0%, #7e2922 100%)' }}
    >
      <div className="font-serif text-[15px] font-medium mb-1">
        {day} {typeWord} · {minyan.yes_count} committed
      </div>
      <div className="text-[10px] opacity-80 mb-3">
        Threshold {minyan.threshold}. {minyan.maybe_count} marked "call me."
      </div>
      <button
        onClick={sendAlert}
        disabled={sending || (result?.delivered ?? 0) > 0}
        className="w-full bg-cream text-alert py-2 rounded-lg text-[11px] font-bold tracking-[0.05em]"
      >
        {buttonLabel()}
      </button>
      {result?.first_error && (
        <div className="text-[10px] opacity-80 mt-2">{result.first_error}</div>
      )}
    </div>
  );
}
