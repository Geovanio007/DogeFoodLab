import React from 'react';
import DogeFoodLogo from './DogeFoodLogo';

// In-page companion to LabRouteLoader.jsx: that one is the full-viewport
// screen shown while a page's code is still downloading; this is the
// smaller version a page drops into its own content area while its first
// data fetch is still in flight, so the two hand off to each other
// seamlessly instead of a branded screen giving way to a plain spinner.
const LabInlineLoader = ({ message = 'Loading…', size = 'medium', minHeight = 240 }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, minHeight, width: '100%',
  }}>
    <style>{`
      @keyframes labInlineBreathe {
        0%, 100% { transform: scale(1);    opacity: 0.65; }
        50%      { transform: scale(1.08); opacity: 1;    }
      }
      .lab-inline-loader-logo { animation: labInlineBreathe 1.8s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .lab-inline-loader-logo { animation: none !important; }
      }
    `}</style>
    <DogeFoodLogo size={size} showText={false} showBeta={false} className="lab-inline-loader-logo" />
    {message && (
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{message}</p>
    )}
  </div>
);

export default LabInlineLoader;
