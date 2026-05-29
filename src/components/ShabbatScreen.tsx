export function ShabbatScreen({ reason, endsAt }: { reason?: string; endsAt?: Date }) {
  const endsStr = endsAt
    ? endsAt.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-parchment to-cream-warm pt-safe pb-safe">
      <div className="text-6xl mb-8" aria-hidden>🕯️</div>
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-deep mb-4">
        {reason || 'Shabbat'}
      </div>
      <h1 className="font-serif text-4xl text-ink mb-4 italic">
        {reason?.toLowerCase().includes('shabbat') ? 'Shabbat Shalom' : 'Chag Sameach'}
      </h1>
      <p className="text-ink-light text-base leading-relaxed max-w-xs">
        The app rests with the kehilla. We'll see you after{endsStr ? ` ${endsStr}` : ' havdalah'}.
      </p>
    </div>
  );
}
