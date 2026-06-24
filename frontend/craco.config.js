const webpack = require('webpack');
const path = require('path');

/**
 * CRACO configuration.
 *
 * 1. Adds browser polyfills for Node core modules pulled in by DogeOS SDK's
 *    multi-chain wallet libraries (Bitcoin/Dogecoin, Cosmos, Keplr, Starknet,
 *    OKX, ...).
 *
 * 2. Routes the DogeOS SDK's prebuilt CSS bundle through a minimal css-loader
 *    pipeline that skips PostCSS / Tailwind processing. The SDK ships with
 *    Tailwind v4 `@layer base` syntax which Tailwind v3 (used in this app)
 *    can't parse.
 */

const DOGEOS_CSS_RE = /node_modules[\\/]@dogeos[\\/]dogeos-sdk[\\/]dist[\\/].+\.css$/;

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // â”€â”€ Node polyfills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.fallback = {
        ...(webpackConfig.resolve.fallback || {}),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser.js'),
        assert: require.resolve('assert/'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
        url: require.resolve('url/'),
        zlib: require.resolve('browserify-zlib'),
        vm: require.resolve('vm-browserify'),
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        starknet: false,
        // @metamask/sdk (via wagmi) optionally imports this React-Native-only
        // package which doesn't exist in a web build. Resolve it to an empty
        // module so it's not a fatal "Module not found" error.
        '@react-native-async-storage/async-storage': false,
      };

      // â”€â”€ Stub unused multi-chain SDKs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // DogeOS SDK transitively imports adapters for Sui, Tron, Solana,
      // Cosmos, etc. We only use EVM, so replace these modules (and any
      // of their subpaths) with a safe no-op stub to avoid runtime crashes.
      const chainStub = path.resolve(__dirname, 'src/empty-chain-stub.js');
      // Regex covers full package + any subpath import.
      const UNUSED_CHAIN_RE = /^(?:@mysten\/sui|@mysten\/bcs|tronweb|@solana\/web3\.js|@cosmjs\/[a-z-]+|@keplr-wallet\/crypto|@cubist-labs\/cubesigner-sdk|@okxweb3\/coin-bitcoin|bitcore-lib-doge|aptos|near-api-js|@aptos-labs\/ts-sdk)(?:\/.*)?$/;

      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(UNUSED_CHAIN_RE, (resource) => {
          resource.request = chainStub;
        })
      );

      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser.js',
        })
      );

      // Allow ESM imports without fully specified file extensions.
      webpackConfig.module = webpackConfig.module || {};
      webpackConfig.module.rules = webpackConfig.module.rules || [];
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      });

      // â”€â”€ DogeOS SDK CSS: bypass Tailwind / PostCSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // CRA's CSS handling sits inside the big `oneOf` array of the main rule.
      // We add an exclusion for the DogeOS SDK CSS and inject a dedicated
      // rule that uses style-loader + css-loader only.
      const mainRule = webpackConfig.module.rules.find(
        (r) => Array.isArray(r.oneOf)
      );
      if (mainRule && Array.isArray(mainRule.oneOf)) {
        mainRule.oneOf.forEach((rule) => {
          if (!rule || !rule.test) return;
          const testStr = rule.test.toString();
          if (testStr.includes('css')) {
            rule.exclude = ([].concat(rule.exclude || [])).concat(DOGEOS_CSS_RE);
          }
        });

        // Insert our dedicated rule BEFORE the file-loader fallback (which is
        // typically the last entry of `oneOf`).
        const fallbackIdx = mainRule.oneOf.length - 1;
        mainRule.oneOf.splice(fallbackIdx, 0, {
          test: DOGEOS_CSS_RE,
          use: [
            require.resolve('style-loader'),
            {
              loader: require.resolve('css-loader'),
              options: { sourceMap: false, importLoaders: 1 },
            },
            // Strip Tailwind-v4 Preflight `@layer base` / `@layer properties`
            // global resets so they don't override the host app's styles.
            {
              loader: path.resolve(
                __dirname,
                'scripts/strip-dogeos-base-loader.js'
              ),
            },
          ],
        });
      }

      // Silence noisy source-map warnings from third-party libs.
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        /Failed to parse source map/,
        /Critical dependency: require function is used in a way/,
        /Critical dependency: the request of a dependency is an expression/,
        /Can't resolve '@react-native-async-storage\/async-storage'/,
      ];

      return webpackConfig;
    },
  },
};
