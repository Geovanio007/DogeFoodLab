import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const HappyHourBanner = () => {
  const [status, setStatus] = useState(null);
  const [countdown, setCountdown] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/happy-hour/status`);
      if (res.ok) setStatus(await res.json());
    } catch (e) {
      console.error('Happy Hour fetch error:', e);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!status) return;

    const tick = () => {
      if (status.active) {
        const remaining = status.remaining_seconds;
        const now = Date.now();
        const elapsed = Math.floor((now - fetchTimestamp) / 1000);
        const left = Math.max(0, remaining - elapsed);
        const m = Math.floor(left / 60);
        const s = left % 60;
        setCountdown(`${m}m : ${s.toString().padStart(2, '0')}s`);
        if (left <= 0) fetchStatus();
      } else {
        const secsUntil = status.seconds_until_next;
        const now = Date.now();
        const elapsed = Math.floor((now - fetchTimestamp) / 1000);
        const left = Math.max(0, secsUntil - elapsed);
        const h = Math.floor(left / 3600);
        const m = Math.floor((left % 3600) / 60);
        const s = left % 60;
        setCountdown(`${h}h ${m.toString().padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`);
        if (left <= 0) fetchStatus();
      }
    };

    const fetchTimestamp = Date.now();
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [status, fetchStatus]);

  if (!status) return null;

  if (status.active) {
    return (
      <div
        className="mb-6 w-full"
        data-testid="happy-hour-banner"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1629 100%)',
          borderRadius: '20px',
          padding: '3px',
          boxShadow: '0 0 30px rgba(251, 191, 36, 0.25), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Outer glow border */}
        <div
          style={{
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #1e1b3a 0%, #2d1b4e 40%, #1a1a2e 100%)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'stretch',
            minHeight: '160px',
          }}
        >
          {/* Subtle purple nebula glow background */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 15% 50%, rgba(139,92,246,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(251,191,36,0.10) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />

          {/* Left — Mascot area */}
          <div style={{
            position: 'relative',
            width: '42%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: '0',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {/* Warm floor glow under mascot */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: '10%',
              right: '10%',
              height: '60px',
              background: 'radial-gradient(ellipse at 50% 100%, rgba(251,146,60,0.35) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Mascot: Shiba scientist emoji with lab coat feel */}
            <div style={{
              fontSize: '80px',
              lineHeight: 1,
              filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              userSelect: 'none',
              paddingBottom: '8px',
              position: 'relative',
              zIndex: 2,
            }}>
              🐕
            </div>

            {/* Decorative bone treats */}
            <div style={{
              position: 'absolute', bottom: 6, left: 12,
              fontSize: '18px', opacity: 0.7,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            }}>🦴</div>
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              fontSize: '14px', opacity: 0.5,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            }}>🦴</div>

            {/* Paw prints floating */}
            <div style={{ position: 'absolute', top: 14, right: 16, fontSize: '13px', opacity: 0.45 }}>🐾</div>
            <div style={{ position: 'absolute', top: 38, left: 18, fontSize: '10px', opacity: 0.3 }}>🐾</div>
          </div>

          {/* Right — Content area */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '16px 16px 16px 4px',
            gap: '10px',
          }}>
            {/* HAPPY HOUR + LIVE badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#ffffff',
                  textShadow: '0 0 20px rgba(251,191,36,0.5), 2px 2px 0 rgba(0,0,0,0.5)',
                  letterSpacing: '-0.5px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  HAPPY
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  letterSpacing: '-0.5px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  HOUR
                </div>
              </div>

              {/* LIVE badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, #ec4899, #db2777)',
                borderRadius: '6px',
                padding: '3px 8px',
                marginTop: '4px',
                boxShadow: '0 0 12px rgba(236,72,153,0.5)',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 0 6px #fff',
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }} />
                <span style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '1px',
                }}>LIVE</span>
              </div>
            </div>

            {/* +25% BONUS box */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '10px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#fbbf24',
                  lineHeight: 1,
                  textShadow: '0 0 12px rgba(251,191,36,0.6)',
                }}>
                  +{status.bonus_percent}%
                </div>
                <div style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '12px',
                  lineHeight: 1.2,
                }}>BONUS</div>
                <div style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '10px',
                  lineHeight: 1.3,
                  marginTop: '1px',
                }}>points on all<br />treats collected now</div>
              </div>
              <div style={{
                width: '32px', height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(251,191,36,0.5)',
                flexShrink: 0,
              }}>
                <Zap size={16} color="#1a1a2e" strokeWidth={2.5} />
              </div>
            </div>

            {/* Countdown box */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '10px',
              padding: '6px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{
                color: '#fbbf24',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}>ENDS IN</div>
              <div style={{
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '22px',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                lineHeight: 1.2,
                textShadow: '0 0 16px rgba(255,255,255,0.3)',
              }}>{countdown}</div>
            </div>
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Upcoming state — styled to match overall design language
  return (
    <div
      className="mb-6 w-full"
      data-testid="happy-hour-banner"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '3px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{
        borderRadius: '18px',
        background: 'linear-gradient(135deg, #1e1b3a 0%, #1a1a2e 100%)',
        border: '1px solid rgba(100,116,139,0.3)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        gap: '12px',
      }}>
        {/* Clock icon area */}
        <div style={{
          width: '44px', height: '44px',
          borderRadius: '12px',
          background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(251,191,36,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Clock size={20} color="#fbbf24" />
        </div>

        {/* Left text */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: '#e2e8f0',
            fontWeight: 700,
            fontSize: '13px',
          }}>Happy Hour</div>
          <div style={{
            color: '#94a3b8',
            fontSize: '11px',
            marginTop: '2px',
          }}>
            +{status.bonus_percent}% bonus points daily at {status.start_hour_utc}:00 UTC
          </div>
        </div>

        {/* Right countdown */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            color: '#64748b',
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>Starts in</div>
          <div style={{
            color: '#fbbf24',
            fontWeight: 700,
            fontSize: '14px',
            fontFamily: 'monospace',
          }}>{countdown}</div>
        </div>
      </div>
    </div>
  );
};

export default HappyHourBanner;
