const path = require("path");

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
  },
  devServer: {
    host: process.env.HOST,
    port: process.env.PORT,
    client: {
      overlay: false,
    }
  }
};
