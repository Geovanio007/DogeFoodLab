import React from 'react';

/**
 * Catches any synchronous errors thrown inside the wallet provider /
 * connection flow (DogeOS SDK, wagmi, etc.) so a buggy SDK call — e.g.
 * `MyDoge not supported` thrown from `connectMobile()` on iOS/Android —
 * doesn't unmount the entire React tree on mobile devices.
 *
 * The boundary auto-recovers after a short delay so users can pick a
 * different wallet without a hard refresh.
 */
class WalletErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn('[WalletErrorBoundary] caught:', error?.message || error, info?.componentStack?.slice(0, 200));
    // Auto-recover so the rest of the app stays interactive.
    setTimeout(() => this.setState({ hasError: false }), 250);
  }

  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

export default WalletErrorBoundary;
