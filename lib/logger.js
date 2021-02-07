const { CustomInstance } = require('better-logging')
const betterLogging = CustomInstance(console)
const better = {}
betterLogging(better)

module.exports = better
