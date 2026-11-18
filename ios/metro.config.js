const { getDefaultConfig } = require('expo/metro-config');
const { withAgentSimulator } = require('agent-simulator/runtime/metro-plugin');

const config = getDefaultConfig(__dirname);

module.exports = withAgentSimulator(config);
