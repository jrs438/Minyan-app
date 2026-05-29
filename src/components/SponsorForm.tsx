'use client';
import { useState } from 'react';
import { formatServiceDate } from '@/lib/time';

const TIERS = [
  { cents: 1800, label: '$18', name: 'Chai' },
  { cents: 3600, label: '$36', name: 'Double Chai' },
  { cents: 5400, label: '$54', name: 'Triple Chai' },
  { cents: 10000, label: '$100', name: 'Benefactor' }
];

type ContributionType = 'dedication' | 'pool';
type DedicationType = 'memory' | 'honor' | 'refuah' | 'anniversary' | 'other';

export function SponsorForm({
  memberId,
  memberName,
  upcomingMinyanim,
  preselectMinyanId
}: {
  memberId: string;
  memberName: string;
  upcomingMinyanim: Array<{
    id: string;
    service_date: string;
    minyan_type: string;
    display_time: string;
    start_time: string;
  }>;
  preselectMinyanId?: string;
}) {
  const [amountCents, setAmountCents] = useState(3600);
  const [customAmount, setCustomAmount] = useState('');
  const [contribType, setContribType] = useState<ContributionType>(
    preselectMinyanId ? 'dedication' : 'dedication'
  );
  const [dedicationType, setDedicationType] = useState<DedicationType>('memory');
  const [dedicationText, setDedicationText] = useState('');
  const [sponsorDisplayName, setSponsorDisplayName] = useState(memberName);
  const [selectedMinyanId, setSelectedMinyanId] = useState(preselectMinyanId || '');
  const [isYahrzeit, setIsYahrzeit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalAmount = customAmount ? Math.round(parseFloat(customAmount) * 100) : amountCents;

  async function submit() {
    if (!finalAmount || finalAmount < 500) {
      setError('Please enter at least $5');
      return;
    }
    if (contribType === 'dedication' && !dedicationText.trim()) {
      setError('Please enter the dedication name');
      return;
    }
    setError(null);
    setLoading(true);

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_cents: finalAmount,
        contribution_type: contribType,
        dedication: contribType === 'dedication' ? {
          dedication_type: dedicationType,
          dedication_text: dedicationText.trim(),
          sponsor_display_name: sponsorDisplayName.trim() || 'Anonymous',
          is_yahrzeit: isYahrzeit,
          minyan_id: selectedMinyanId || null
        } : null
      })
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div>
      <div className="section-label">Choose an Amount</div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {TIERS.map(t => (
          <button
            key={t.cents}
            onClick={() => { setAmountCents(t.cents); setCustomAmount(''); }}
            className={`rounded-xl py-3 text-center border transition-colors ${
              !customAmount && amountCents === t.cents
                ? 'bg-ink text-cream border-ink'
                : 'bg-parchment text-ink border-black/10'
            }`}
          >
            <div className="font-serif text-[22px] font-semibold leading-none">{t.label}</div>
            <div className="text-[10px] tracking-widest uppercase mt-1 opacity-70">{t.name}</div>
          </button>
        ))}
      </div>

      <input
        type="number"
        placeholder="Other amount"
        value={customAmount}
        onChange={e => setCustomAmount(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-cream-warm border border-black/10 text-[13px] mb-5"
      />

      <div className="section-label">How to Contribute</div>
      <button
        onClick={() => setContribType('dedication')}
        className={`w-full text-left rounded-xl p-3.5 mb-2 border-2 transition-colors ${
          contribType === 'dedication'
            ? 'bg-cream-warm border-gold'
            : 'bg-parchment border-black/10'
        }`}
      >
        <div className="font-semibold text-[13px] text-ink">Dedicate to a specific date</div>
        <div className="text-[10px] text-muted mt-0.5">
          Your dedication appears at that minyan · tax-deductible
        </div>
      </button>
      <button
        onClick={() => setContribType('pool')}
        className={`w-full text-left rounded-xl p-3.5 mb-4 border transition-colors ${
          contribType === 'pool'
            ? 'bg-cream-warm border-gold'
            : 'bg-parchment border-black/10'
        }`}
      >
        <div className="font-semibold text-[13px] text-ink">Contribute to the pool</div>
        <div className="text-[10px] text-muted mt-0.5">Anonymous · tax-deductible</div>
      </button>

      {contribType === 'dedication' && (
        <div className="space-y-3 mb-5 bg-cream-warm/60 rounded-xl p-4 border border-black/5">
          <div>
            <div className="section-label">Dedication Type</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { v: 'memory', l: 'In memory of' },
                { v: 'honor', l: 'In honor of' },
                { v: 'refuah', l: 'Refuah shleima' },
                { v: 'anniversary', l: 'Anniversary' }
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setDedicationType(opt.v as DedicationType)}
                  className={`rounded-lg py-2 text-[11px] font-medium border ${
                    dedicationType === opt.v
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-parchment text-ink border-black/10'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="section-label block">Name</label>
            <input
              value={dedicationText}
              onChange={e => setDedicationText(e.target.value)}
              placeholder={
                dedicationType === 'memory' ? "e.g. Moshe ben Avraham, z''l" :
                dedicationType === 'honor' ? "e.g. Rabbi Stein" :
                dedicationType === 'refuah' ? "e.g. Sarah bat Rachel" :
                'Name'
              }
              className="w-full px-3 py-2.5 rounded-lg bg-parchment border border-black/10 text-[13px]"
            />
          </div>

          <label className="flex items-center gap-2 text-[12px] text-ink-light cursor-pointer">
            <input
              type="checkbox"
              checked={isYahrzeit}
              onChange={e => setIsYahrzeit(e.target.checked)}
              className="w-4 h-4 accent-gold"
            />
            This is a yahrzeit dedication
          </label>

          <div>
            <label className="section-label block">Attach to a specific minyan (optional)</label>
            <select
              value={selectedMinyanId}
              onChange={e => setSelectedMinyanId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-parchment border border-black/10 text-[12px]"
            >
              <option value="">No specific minyan — general dedication</option>
              {upcomingMinyanim.map(m => {
                const dayStr = formatServiceDate(m.service_date, {
                  weekday: 'short', month: 'short', day: 'numeric'
                });
                const type = m.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
                return (
                  <option key={m.id} value={m.id}>
                    {dayStr} · {type} · {m.display_time}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="section-label block">Sponsor Display Name</label>
            <input
              value={sponsorDisplayName}
              onChange={e => setSponsorDisplayName(e.target.value)}
              placeholder="e.g. The Cohen Family · Anonymous"
              className="w-full px-3 py-2.5 rounded-lg bg-parchment border border-black/10 text-[13px]"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-alert bg-alert/10 p-3 rounded-lg mb-3">{error}</div>
      )}

      <button onClick={submit} disabled={loading} className="btn-primary mb-4">
        {loading
          ? 'Taking you to checkout…'
          : `Continue · $${(finalAmount / 100).toFixed(2)}`}
      </button>

      <div className="text-[10px] text-muted text-center italic">
        Payment handled securely by Stripe · receipt sent by email
      </div>
    </div>
  );
}
