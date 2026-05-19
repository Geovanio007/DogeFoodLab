import React from 'react';

/**
 * Catches synchronous render errors anywhere inside MainMenu so that a
 * single broken sub-component (wallet-state mismatch, undefined NFT
 * data on real devices, etc.) doesn't blank the whole screen.
 *
 * The fallback offers a one-tap reload — the most reliable recovery
 * path for transient wallet-state desync on real mobile devices.
 */
class MenuErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    console.error('[MenuErrorBoundary] caught:', error, info?.componentStack?.slice(0, 400));
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch (_) {
      this.setState({ hasError: false });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        data-testid="menu-error-fallback"
        className="min-h-[60vh] flex items-center justify-center p-6"
      >
        <div className="w-full max-w-sm text-center rounded-3xl p-6 border-2 border-yellow-300/70 bg-gradient-to-br from-blue-700/95 via-indigo-800/95 to-purple-900/95 shadow-[0_30px_80px_-10px_rgba(56,189,248,0.55)]">
          <div className="text-5xl mb-3" aria-hidden>🧪</div>
          <h3
            className="text-white font-bold text-xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Lab hiccup
          </h3>
          <p className="text-white/85 text-sm mt-2 leading-snug">
            Something glitched while loading your menu. Give it a quick refresh
            and you'll be back at the bench.
          </p>
          <button
            data-testid="menu-error-reload-btn"
            onClick={this.handleReload}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-blue-900 text-sm font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            Reload
            <span aria-hidden>↻</span>
          </button>
        </div>
      </div>
    );
  }
}

export default MenuErrorBoundary;
