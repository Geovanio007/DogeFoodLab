import React, { useEffect, useState } from 'react';

/**
 * DebugOverlay
 *
 * On-device error capture. Append `?debug=1` to the URL and any
 * page errors, unhandled rejections, and console errors are pinned to
 * the bottom of the screen so they're screenshot-able from a real
 * phone (where DevTools isn't available).
 *
 * Lives outside the wallet/router trees so it survives crashes in any
 * other component.
 */
const DebugOverlay = () => {
  const [entries, setEntries] = useState([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const on =
      params.get('debug') === '1' ||
      window.localStorage?.getItem('dogefood_debug') === '1';
    if (!on) return undefined;
    setEnabled(true);
    // Persist for refreshes during a session
    try { window.localStorage?.setItem('dogefood_debug', '1'); } catch (_) { /* ignore */ }

    const push = (type, message) => {
      const text = typeof message === 'string' ? message : String(message);
      setEntries((prev) => [
        ...prev.slice(-9),
        { t: Date.now(), type, message: text.slice(0, 500) },
      ]);
    };

    const onError = (event) => {
      const msg = event?.error?.message || event?.message || 'window.error';
      push('error', msg);
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      const msg = reason?.message || (typeof reason === 'string' ? reason : JSON.stringify(reason || {}).slice(0, 300));
      push('rejection', msg);
    };
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...args) => { push('console.error', args.map(String).join(' ')); origError.apply(console, args); };
    console.warn  = (...args) => { push('console.warn',  args.map(String).join(' ')); origWarn.apply(console, args); };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);
    push('debug', `enabled • UA=${(navigator.userAgent || '').slice(0, 80)}`);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection, true);
      console.error = origError;
      console.warn = origWarn;
    };
  }, []);

  const clear = () => setEntries([]);
  const disable = () => {
    try { window.localStorage?.removeItem('dogefood_debug'); } catch (_) { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.delete('debug');
    window.location.replace(url.toString());
  };

  if (!enabled) return null;

  return (
    <div
      data-testid="debug-overlay"
      className="fixed left-2 right-2 bottom-2 z-[100000] pointer-events-auto"
      style={{ maxHeight: '40vh' }}
    >
      <div className="rounded-lg bg-black/85 border border-yellow-300/70 text-[11px] text-white font-mono shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1 bg-yellow-300 text-black font-bold text-[10px]">
          <span>DEBUG • {entries.length} entries</span>
          <span className="flex gap-1.5">
            <button onClick={clear}   className="px-1.5 py-0.5 rounded bg-black/15 hover:bg-black/30">clear</button>
            <button onClick={disable} className="px-1.5 py-0.5 rounded bg-black/15 hover:bg-black/30">off</button>
          </span>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '35vh' }}>
          {entries.length === 0 ? (
            <div className="p-2 text-white/60">No errors yet — tap around the app and crash points will appear here.</div>
          ) : entries.map((e, i) => (
            <div key={i} className="px-2 py-1 border-t border-white/10 break-all">
              <span
                className={
                  e.type === 'error' || e.type === 'rejection' || e.type === 'console.error'
                    ? 'text-red-300'
                    : 'text-yellow-200'
                }
              >
                {e.type}
              </span>
              {' '}
              <span className="text-white/90">{e.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DebugOverlay;
