module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // drizzle-kit が生成した .sql マイグレーションを文字列としてバンドルに取り込む
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
