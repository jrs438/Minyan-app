import Link from 'next/link';
import type { Role } from '@/lib/types';

type Tab = 'home' | 'leaderboard' | 'rides' | 'checkin' | 'gabbai' | 'profile' | 'store' | 'raffle';

export function BottomTabBar({ active, role }: { active: Tab; role: Role }) {
  const isGabbai = role === 'gabbai' || role === 'admin';

  const tabs: Array<{ key: Tab; href: string; icon: string; label: string }> = [
    { key: 'home', href: '/home', icon: '✡', label: 'Home' },
    { key: 'leaderboard', href: '/leaderboard', icon: '🏆', label: 'Board' },
    { key: 'checkin', href: '/checkin', icon: '✓', label: 'Check-In' },
    { key: 'rides', href: '/rides', icon: '🚗', label: 'Rides' },
    isGabbai
      ? { key: 'gabbai', href: '/gabbai', icon: '⚙', label: 'Gabbai' }
      : { key: 'profile', href: '/profile', icon: '○', label: 'Profile' }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-parchment border-t border-black/10 pb-safe z-40"
      style={{ boxShadow: '0 -4px 20px rgba(15,30,46,0.04)' }}
    >
      <div className="flex justify-around items-start pt-2 pb-1 max-w-md mx-auto">
        {tabs.map(t => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              className="flex flex-col items-center gap-0.5 flex-1 py-1.5"
            >
              <span className={`text-lg ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                {t.icon}
              </span>
              <span
                className={`text-[9px] tracking-wider uppercase ${
                  isActive ? 'text-ink font-bold' : 'text-muted font-medium'
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
