import Link from 'next/link';
import { AppHeader } from './AppHeader';
import { CommitCard } from './CommitCard';
import { SponsoredCard } from './SponsoredCard';
import { QuickTiles } from './PoolAndTiles';
import type { Member, UpcomingMinyan, PoolState, LeaderboardRow } from '@/lib/types';

export function TeenHome({
  member,
  upcoming,
  commitMap,
  stats
}: {
  member: Member;
  upcoming: UpcomingMinyan[];
  commitMap: Record<string, { status: string; needs_ride: boolean }>;
  pool: PoolState | null;
  stats: {
    points: number;
    minyanim: number;
    rank: number;
    totalTeens: number;
    streak: number;
    climb: LeaderboardRow[];
  };
}) {
  const sponsored = upcoming.find(m => m.has_dedication);
  const next = upcoming[0];

  const streakDays = stats.streak;

  return (
    <div>
      <AppHeader member={member} />
      <div className="px-5 pt-4">
        {/* Stats strip */}
        <div
          className="relative overflow-hidden rounded-xl p-4 text-cream mb-4"
          style={{ background: 'linear-gradient(135deg, #2a1f1a 0%, #0f1e2e 100%)' }}
        >
          <div
            className="absolute -top-8 -right-8 w-24 h-24 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(214,112,80,0.22) 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="font-serif text-[13px] text-cream/70 mb-2">
              Shalom, <em>{member.first_name}</em>
            </div>
            <div className="flex gap-5">
              <StatCell value={`🔥 ${streakDays}`} label="Day Streak" />
              <StatCell value={stats.points.toString()} label="Points · Month" />
              <StatCell
                value={`#${stats.rank}`}
                label={`Of ${stats.totalTeens || 1}`}
              />
            </div>
          </div>
        </div>

        {/* Sponsored minyan takes priority */}
        {sponsored && <SponsoredCard minyan={sponsored} />}

        {/* Next commit */}
        {next && next.id !== sponsored?.id && (
          <CommitCard
            minyan={next}
            myStatus={commitMap[next.id]?.status as any}
            extraLine={
              next.has_dedication
                ? 'Dedicated minyan · +4 bonus pts'
                : `Coming earns +8 pts · keeps your streak alive`
            }
          />
        )}

        {/* Climb card */}
        {stats.climb.length > 0 && (
          <Link
            href="/leaderboard"
            className="block bg-cream-warm border border-black/5 rounded-xl p-3.5 my-3.5 active:bg-cream"
          >
            <div className="font-serif text-[15px] font-medium text-ink mb-2.5">Climb the board</div>
            {stats.climb.map((r, i) => {
              const isYou = r.id === member.id;
              const rank = stats.rank - (stats.climb.length - 1 - i);
              const above = stats.climb[i + 1];
              const gap = above && !isYou ? above.points_this_month - r.points_this_month : null;
              return (
                <div
                  key={r.id}
                  className={`flex justify-between py-1.5 text-[12px] border-b border-dashed border-black/5 last:border-0 ${
                    isYou ? 'text-ink font-bold' : 'text-ink-light'
                  }`}
                >
                  <span>
                    <span className="font-mono text-[11px] mr-2">#{rank}</span>
                    {isYou ? 'You' : `${r.first_name} ${r.last_name[0]}.`}
                  </span>
                  <span>
                    {r.points_this_month}
                    {gap !== null && gap > 0 && (
                      <span className="text-gold-deep font-mono text-[11px] ml-1">(+{gap})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </Link>
        )}

        <QuickTiles showRewards />
      </div>
    </div>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1">
      <div className="font-serif text-2xl font-semibold text-gold-soft leading-none mb-1">{value}</div>
      <div className="text-[9px] tracking-widest uppercase text-cream/55 font-medium">{label}</div>
    </div>
  );
}
