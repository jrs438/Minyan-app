import { AppHeader } from './AppHeader';
import { MinyanLine } from './MinyanLine';
import { SponsoredCard } from './SponsoredCard';
import { CommitCard } from './CommitCard';
import { PoolCard, QuickTiles } from './PoolAndTiles';
import type { Member, UpcomingMinyan, PoolState } from '@/lib/types';

export function MemberHome({
  member,
  upcoming,
  commitMap,
  pool
}: {
  member: Member;
  upcoming: UpcomingMinyan[];
  commitMap: Record<string, { status: string; needs_ride: boolean }>;
  pool: PoolState | null;
}) {
  const sponsored = upcoming.find(m => m.has_dedication);
  const next = upcoming[0];
  const rest = upcoming.filter(m => m.id !== (sponsored?.id || '') && m.id !== (next?.id || '')).slice(0, 3);

  return (
    <div>
      <AppHeader member={member} />
      <div className="px-5 pt-4">
        <div className="section-label">Upcoming</div>

        {sponsored && <SponsoredCard minyan={sponsored} />}

        {next && next.id !== sponsored?.id && (
          <CommitCard
            minyan={next}
            myStatus={commitMap[next.id]?.status as any}
          />
        )}

        {rest.length > 0 && (
          <div className="card p-0 px-4 my-3.5">
            {rest.map(m => (
              <MinyanLine
                key={m.id}
                minyan={m}
                myStatus={commitMap[m.id]?.status as any}
              />
            ))}
          </div>
        )}

        <PoolCard pool={pool} />
        <QuickTiles />
      </div>
    </div>
  );
}
