const { getDefaultConfig } = require("expo/metro-config");
const { withExpoRouter } = require("expo-router/metro");

const config = getDefaultConfig(__dirname);

module.exports = withExpoRouter(config);
