const path = require('path');

const aliases = {
  '@': './src',
};

const resolvedAliases = Object.fromEntries(
  Object.entries(aliases).map(([key, value]) => [
    key,
    path.resolve(__dirname, value),
  ]),
);

module.exports = {
  webpack: {
    alias: resolvedAliases,
    configure: (webpackConfig) => {
      // Optimize for production build memory usage
      if (process.env.NODE_ENV === 'production') {
        // Disable source maps to save memory
        webpackConfig.devtool = false;

        // Optimize chunks
        if (webpackConfig.optimization) {
          webpackConfig.optimization.splitChunks = {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /node_modules/,
                priority: 20,
              },
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          };

          // Minimize memory footprint
          webpackConfig.optimization.minimize = true;
          webpackConfig.optimization.usedExports = true;
          webpackConfig.optimization.sideEffects = true;
        }

        // Reduce parallelism to save memory
        webpackConfig.parallelism = 1;
      }

      return webpackConfig;
    },
  },
  devServer: {
    host: process.env.HOST,
    port: process.env.PORT,
    client: {
      overlay: false,
    },
  },
};
