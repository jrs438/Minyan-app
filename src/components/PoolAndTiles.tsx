import Link from 'next/link';
import type { PoolState } from '@/lib/types';

export function PoolCard({ pool }: { pool: PoolState | null }) {
  const dollars = pool ? (pool.balance_cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0';
  return (
    <Link
      href="/sponsor"
      className="flex justify-between items-center bg-cream-warm border border-black/10 rounded-lg px-4 py-3 my-3.5 active:bg-cream"
    >
      <div>
        <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-deep">
          Incentive Pool
        </div>
        <div className="font-serif text-[22px] font-semibold text-ink leading-tight mt-0.5">
          ${dollars}
        </div>
      </div>
      <div className="text-[11px] text-gold-deep font-semibold">Sponsor ›</div>
    </Link>
  );
}

export function QuickTiles({ showRewards = false }: { showRewards?: boolean }) {
  const tiles = [
    { icon: '🏆', label: 'Leaderboard', href: '/leaderboard' },
    showRewards
      ? { icon: '🎁', label: 'Rewards', href: '/profile' }
      : { icon: '🚗', label: 'Rides', href: '/rides' },
    { icon: '✓', label: 'Check-In', href: '/checkin' }
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map(t => (
        <Link
          key={t.label}
          href={t.href}
          className="bg-cream-warm border border-black/5 rounded-xl py-3.5 px-2 text-center active:bg-cream"
        >
          <div className="text-lg mb-1">{t.icon}</div>
          <div className="text-[10px] font-semibold text-ink">{t.label}</div>
        </Link>
      ))}
    </div>
  );
}
