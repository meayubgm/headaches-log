const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// drizzle-kit が生成した .sql マイグレーションを migrations.js から import できるようにする
config.resolver.sourceExts.push('sql');
// expo-sqlite の Web 実装（wa-sqlite）が読み込む .wasm をアセットとして解決できるようにする
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './src/global.css' });
