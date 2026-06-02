const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable `exports` field resolution so mapbox-gl and other
// ESM-first packages resolve correctly in the Metro bundler.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
