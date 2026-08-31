const webpack = require('webpack');
const path = require('path');

/**
 * CRACO configuration.
 *
 * Adds browser polyfills for Node core modules pulled in by DogeOS SDK
 * dependencies and routes the SDK CSS through a minimal css-loader pipeline.
 */

const DOGEOS_CSS_RE = /node_modules[\\/]@dogeos[\\/]dogeos-sdk[\\/]dist[\\/].+\.css$/;

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
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
        '@react-native-async-storage/async-storage': false,
      };

      const chainStub = path.resolve(__dirname, 'src/empty-chain-stub.js');
      const UNUSED_CHAIN_RE = /^(?:@mysten\/sui|@mysten\/bcs|tronweb|@solana\/web3\.js|@cosmjs\/[a-z-]+|@keplr-wallet\/crypto|@cubist-labs\/cubesigner-sdk|@okxweb3\/coin-bitcoin|bitcore-lib-doge|aptos|near-api-js|@aptos-labs\/ts-sdk)(?:\/.*)?$/;

      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(UNUSED_CHAIN_RE, (resource) => {
          resource.request = chainStub;
        })
      );

      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser.js',
        })
      );

      webpackConfig.module = webpackConfig.module || {};
      webpackConfig.module.rules = webpackConfig.module.rules || [];
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      });

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

        const fallbackIdx = mainRule.oneOf.length - 1;
        mainRule.oneOf.splice(fallbackIdx, 0, {
          test: DOGEOS_CSS_RE,
          use: [
            require.resolve('style-loader'),
            {
              loader: require.resolve('css-loader'),
              options: { sourceMap: false, importLoaders: 1 },
            },
            {
              loader: path.resolve(
                __dirname,
                'scripts/strip-dogeos-base-loader.js'
              ),
            },
          ],
        });
      }

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
