const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * The package is linked from the repo root (`file:..`), so Metro watches the root too.
 * react and react-native always come from the example's node_modules, never from the
 * root's dev dependencies.
 *
 * @type {import('metro-config').MetroConfig}
 */
const escape = p => p.replace(/[/\]/g, '[/\\]').replace(/\./g, '\.');

const config = {
  watchFolders: [root],
  resolver: {
    blockList: [
      new RegExp(`^${escape(path.join(root, 'node_modules'))}[/\\](react|react-native)[/\\].*$`),
    ],
    nodeModulesPaths: [path.join(__dirname, 'node_modules')],
    extraNodeModules: {
      react: path.join(__dirname, 'node_modules', 'react'),
      'react-native': path.join(__dirname, 'node_modules', 'react-native'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
