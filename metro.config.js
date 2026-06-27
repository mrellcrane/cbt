const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build ships a wa-sqlite.wasm asset; let Metro bundle it.
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './global.css' });
