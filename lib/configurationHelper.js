const minimist = require('minimist')
const loadJsonFile = require('load-json-file')
const fs = require('fs')
const path = require('path')


const configurationHelper = (projectDir) => {
  const configFile = minimist(process.argv.slice(2), {
    string: ['configuration'],
    default: {
      configuration: process.env.NODE_CONFIGURATION || 'configuration.json',
    }
  })['configuration']

  if (fs.existsSync(path.join(projectDir, configFile))) {
    return loadJsonFile.sync(path.join(projectDir, 'configuration.json'))
  } else {
    better.error('no configuration found')
    better.error('you can use our template as startingpoint:')
    better.error('cp ' + path.join(resourcesDir, 'misc', 'configuration.json.dist') + ' ' + path.join(projectDir, 'configuration.json'))
    process.exit(1)
  }
}

const options = (configuration) => {
  return minimist(process.argv.slice(2), {
    string: ['target1', 'target2', 'conc', 'domain', 'single', 'class', 'skipTarget', 'browser', 'debug'],
    default: {
      skipTarget: process.env.NODE_SKIP_TARGET || '',
      conc: process.env.NODE_CONC || 5,
      class: process.env.NODE_CLASS || '',
      single: process.env.NODE_SINGLE || '',
      browser: process.env.NODE_browser || configuration.default.browser || 'fullpage',
      domain: process.env.NODE_DOMAIN || configuration.default.domain || '_all_',
      target1: process.env.NODE_TARGET1 || configuration.default.target1 || 'live',
      target2: process.env.NODE_TARGET2 || configuration.default.target2 || 'dev',
      debug: process.env.NODE_DEBUG || configuration.default.debug || 0
    }
  })
}

module.exports = {
  configuration: configurationHelper,
  options
}
