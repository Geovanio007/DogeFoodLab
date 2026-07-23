import React from 'react';
import DogeFoodLogo from './DogeFoodLogo';

// Shown the instant a player taps a menu feature, while that page's code
// (and, wherever a page wires in `minShow`/its own fetch, its first bit of
// data) is still loading. Deliberately minimal — no progress simulation, no
// artificial delay — so it never lingers longer than the real load itself
// and disappears the moment the destination is actually ready. This is
// distinct from LoadingScreen.jsx, which stays as the one-time splash
// shown on first opening the app.
const LabRouteLoader = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      background: 'radial-gradient(ellipse at center, #10141f 0%, #05060a 100%)',
    }}
  >
    <style>{`
      @keyframes labLoaderBreathe {
        0%, 100% { transform: scale(1);    opacity: 0.65; }
        50%      { transform: scale(1.08); opacity: 1;    }
      }
      .lab-loader-logo { animation: labLoaderBreathe 1.8s ease-in-out infinite; }

      @keyframes labLoaderGlow {
        0%, 100% { opacity: 0.35; transform: scale(1);    }
        50%      { opacity: 0.7;  transform: scale(1.12); }
      }
      .lab-loader-glow { animation: labLoaderGlow 1.8s ease-in-out infinite; }

      @keyframes labLoaderDots {
        0%, 80%, 100% { opacity: 0.25; }
        40%           { opacity: 1;    }
      }
      .lab-loader-dot { animation: labLoaderDots 1.4s ease-in-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .lab-loader-logo, .lab-loader-glow, .lab-loader-dot { animation: none !important; }
      }
    `}</style>

    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="lab-loader-glow"
        style={{
          position: 'absolute',
          width: 150, height: 150, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 70%)',
        }}
      />
      <DogeFoodLogo size="large" showText={false} showBeta={false} className="lab-loader-logo" />
    </div>

    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.4)',
    }}>
      <span>Loading</span>
      <span style={{ display: 'flex', gap: 3 }}>
        <span className="lab-loader-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animationDelay: '0s' }} />
        <span className="lab-loader-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animationDelay: '0.2s' }} />
        <span className="lab-loader-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animationDelay: '0.4s' }} />
      </span>
    </div>
  </div>
);

export default LabRouteLoader;
