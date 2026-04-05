const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Ensure WAV files are treated as static assets
config.resolver.assetExts.push('wav')

module.exports = config
