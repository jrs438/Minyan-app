'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckInButton({ minyanId }: { minyanId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minyan_id: minyanId })
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: 'Check-in failed' }));
      setError(j.error || 'Check-in failed');
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={submitting}
        className="w-full max-w-xs py-4 rounded-xl bg-ink text-cream font-serif text-xl font-medium tracking-wide active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {submitting ? 'Checking you in…' : "I'm here ✓"}
      </button>
      {error && <div className="mt-3 text-sm text-alert">{error}</div>}
    </>
  );
}
