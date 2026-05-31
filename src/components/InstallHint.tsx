'use client';
import { useEffect, useState } from 'react';

// Three modes:
//   ios     — visual coach card for iPhone Safari, since Apple disallows any
//             programmatic install prompt.
//   android — single Install button wired to the captured beforeinstallprompt.
//   hidden  — already installed (standalone), dismissed, or unsupported browser.
type Mode = 'hidden' | 'ios' | 'android';

export function InstallHint() {
  const [mode, setMode] = useState<Mode>('hidden');
  const [deferred, setDeferred] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('install_hint_dismissed') === '1') return;
    } catch { /* private mode — proceed */ }

    const standalone =
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIOS = /iP(hone|ad|od)/.test(ua);
    if (isIOS) { setMode('ios'); return; }

    // Android Chrome (and other Chromium browsers) fire beforeinstallprompt.
    function handler(e: Event) {
      e.preventDefault();
      setDeferred(e);
      setMode('android');
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    try { localStorage.setItem('install_hint_dismissed', '1'); } catch { /* ignore */ }
    setMode('hidden');
  }

  async function androidInstall() {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
    setMode('hidden');
  }

  if (mode === 'hidden') return null;

  const wrapStyle = {
    bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
    background: 'linear-gradient(135deg, #2a1f1a 0%, #0f1e2e 100%)',
    boxShadow: '0 20px 50px rgba(15,30,46,0.35)'
  };

  if (mode === 'android') {
    return (
      <div className="fixed left-3 right-3 z-50 rounded-xl p-4 flex items-center gap-3 text-cream"
           style={wrapStyle}>
        <div className="flex-1 text-[12px] leading-snug">
          <div className="font-serif font-semibold text-[14px]">Install Minyan</div>
          <div className="text-cream/75">Opens like a regular app, no browser bar.</div>
        </div>
        <button onClick={androidInstall} className="bg-gold text-ink px-4 py-2 rounded-lg text-[12px] font-bold tracking-wide">
          Install
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="text-cream/60 text-xl leading-none px-1">×</button>
      </div>
    );
  }

  // iOS visual coach
  return (
    <div className="fixed left-3 right-3 z-50 rounded-2xl p-5 text-cream" style={wrapStyle}>
      <div className="flex justify-between items-start mb-1">
        <div className="font-serif text-[17px] font-semibold leading-tight">
          Install Minyan on your phone
        </div>
        <button onClick={dismiss} aria-label="Dismiss"
                className="text-cream/60 text-2xl leading-none px-1 -mr-2 -mt-2">×</button>
      </div>
      <div className="text-[12px] text-cream/75 mb-4">Opens like a regular app — no Safari bar.</div>

      <Step n={1}>
        Tap the <ShareIcon /> <strong>Share</strong> button at the bottom of Safari
      </Step>
      <Step n={2}>
        Scroll down and tap <strong>Add to Home Screen</strong>
      </Step>
      <Step n={3}>
        Tap <strong>Add</strong>
      </Step>

      <button onClick={dismiss}
              className="block w-full mt-4 text-[11px] text-cream/55 underline">
        Maybe later
      </button>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-2.5 last:mb-0">
      <div className="font-mono text-[11px] bg-gold/20 text-gold-soft rounded-full w-6 h-6 inline-flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-[13px] leading-snug pt-0.5">{children}</div>
    </div>
  );
}

// Simplified iOS Share glyph (square with up arrow), drawn inline.
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline-block w-4 h-4 align-middle mx-0.5 text-gold-soft"
         fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L12 15" />
      <path d="M8 7 L12 3 L16 7" />
      <path d="M6 11 L6 20 L18 20 L18 11" />
    </svg>
  );
}
