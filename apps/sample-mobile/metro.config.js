// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all monorepo packages so changes propagate via HMR
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure TypeScript files are resolved
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'ts', 'tsx'];

module.exports = config;
