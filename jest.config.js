module.exports = {
  verbose: true,
  bail: true,
  moduleNameMapper: {},
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  rootDir: __dirname,
  modulePaths: ['<rootDir>/src'],
  moduleDirectories: ['<rootDir>/node_modules'],
  restoreMocks: true,
  testMatch: [
    '**/__tests__/**/?(spec|test).js',      // 匹配 __tests__ 文件夹下以 spec.js 或 test.js 结尾的文件
    '**/?(*.)(spec|test).js'                // 匹配任意以 .spec.js 或 .test.js 结尾的文件
  ],
  // 指定模块文件扩展名（只识别 js 文件）
  moduleFileExtensions: ['js'],
  // 忽略这些目录中的模块和文件
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/dev', '<rootDir>/node_modules', '<rootDir>/examples'],
  // collectCoverage: true,                                        // 是否收集代码覆盖率
  // collectCoverageFrom: ['!**/node_modules/**', 'src/**'],       // 指定收集覆盖率的文件
  // coverageDirectory: 'coverage',                                // 覆盖率输出目录
  // coverageReporters: ['html', 'json'],                          // 生成的覆盖率报告类型
  cacheDirectory: '.cache/jest',
}
