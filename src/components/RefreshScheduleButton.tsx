'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshScheduleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/gabbai/sync-schedule', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMsg('Could not refresh. Please try again.');
      } else {
        setMsg(`Synced ${data.scheduled} service times from Hebcal.`);
        router.refresh();
      }
    } catch {
      setMsg('Could not refresh. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      <button onClick={refresh} disabled={loading} className="btn-secondary">
        {loading ? 'Syncing…' : 'Refresh schedule from Hebcal'}
      </button>
      {msg && <p className="text-[12px] text-muted mt-2">{msg}</p>}
    </div>
  );
}
