import Link from 'next/link';
import type { Member } from '@/lib/types';

export function AppHeader({ member, subtitle }: { member: Member; subtitle?: string }) {
  const initials = `${member.first_name[0] || ''}${member.last_name[0] || ''}`.toUpperCase();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long' });
  return (
    <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-black/5">
      <div>
        <div className="font-serif text-[13px] tracking-wider text-ink font-medium">
          Beth Tefillah
        </div>
        <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-gold-deep mt-0.5">
          {subtitle || dateStr}
        </div>
      </div>
      <Link
        href="/profile"
        className="w-8 h-8 rounded-full bg-cream-warm border border-black/10 flex items-center justify-center text-sm font-semibold text-ink"
      >
        {initials}
      </Link>
    </div>
  );
}
