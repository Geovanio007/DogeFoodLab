// Empty stub for unused multi-chain wallet SDKs that the DogeOS SDK pulls
// in transitively (Sui, Tron, Solana, Cosmos, etc.). This app only uses the
// EVM chain (DogeOS Chikyū Testnet), so we redirect these modules to a
// safe no-op stub. Any property / call / class-extension / construction
// returns a benign proxy so module-evaluation never crashes.

function makeStub() {
  // A callable, constructable, extendable proxy.
  const target = function StubClass() {};
  target.prototype = Object.create(null);

  const handler = {
    get(t, prop) {
      // Special-case common module-shape props.
      if (prop === '__esModule') return true;
      if (prop === 'default') return proxy;
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === Symbol.iterator) return function* () {};
      // Recursively return another stub so chains like `a.b.c()` work.
      return proxy;
    },
    apply() {
      return proxy;
    },
    construct() {
      return Object.create(target.prototype);
    },
    has() {
      return true;
    },
  };

  const proxy = new Proxy(target, handler);
  return proxy;
}

const stub = makeStub();

module.exports = stub;
module.exports.default = stub;
