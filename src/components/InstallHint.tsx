'use client';
import { useEffect, useState } from 'react';

// Small "Install on home screen" hint shown on iOS Safari, where the browser
// doesn't show its own install banner. Hides itself if the app is already
// running in standalone mode or the hint has been dismissed before.
export function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('install_hint_dismissed') === '1') return;
    } catch { /* private mode — proceed */ }
    const standalone =
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) return;
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    if (!isIOS) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try { localStorage.setItem('install_hint_dismissed', '1'); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div
      className="fixed left-3 right-3 z-50 rounded-xl p-3 flex items-start gap-2 text-cream"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        background: 'linear-gradient(135deg, #2a1f1a 0%, #0f1e2e 100%)',
        boxShadow: '0 10px 30px rgba(15,30,46,0.25)'
      }}
    >
      <div className="flex-1 text-[12px] leading-snug">
        <div className="font-serif font-semibold mb-0.5">Install Minyan on your home screen</div>
        <div className="text-cream/75">
          Tap the <strong>Share</strong> button below, then <strong>Add to Home Screen</strong>.
        </div>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="text-cream/60 text-xl leading-none px-1">
        ×
      </button>
    </div>
  );
}
