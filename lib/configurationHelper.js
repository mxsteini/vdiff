const minimist = require('minimist')
const loadJsonFile = require('load-json-file')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
const { CustomInstance } = require('better-logging')
const betterLogging = CustomInstance(console)
const better = {}
betterLogging(better)


const configuration = (projectDir, resourcesDir) => {
  const configFile = minimist(process.argv.slice(2), {
    string: ['configuration'],
    default: {
      configuration: process.env.NODE_CONFIGURATION || 'configuration.json',
    }
  })['configuration']

  let configuration = []

  try {
    configuration = loadJsonFile.sync(path.join(projectDir, configFile))
  } catch (error) {
    better.error('no configuration found')
    better.error('you can use our template as startingpoint:')
    better.error('cp ' + path.join(resourcesDir, 'misc', 'configuration.json.dist') + ' ' + path.join(projectDir, 'configuration.json'))
    process.exit(1)
  }

  const domainFile = minimist(process.argv.slice(2), {
    string: ['additionalDomains'],
    default: {
      configuration: process.env.NODE_TARGET_FILE || '',
    }
  })['additionalDomains']

  if (domainFile !== undefined) {

    let additionalDomainsFileContent = ''
    try {
      additionalDomainsFileContent = fs.readFileSync(path.join(projectDir, domainFile), 'utf8')
    } catch (error) {
      better.error('additional tests not found')
      process.exit(1)
    }

    let additionalDomains = []
    try {
      switch (path.extname(domainFile)) {
        case '.yaml':
          additionalDomains = YAML.parse(additionalDomainsFileContent)
          break
        case '.json':
          additionalDomains = JSON.parse(additionalDomainsFileContent)
          break
      }
    } catch (error) {
      console.log('configurationHelper: 64', error)
      better.error('error in additional test file')
      process.exit(1)
    }

    let additionalDomainsKeys = Object.keys(additionalDomains)
    for (let additionalTarget of additionalDomainsKeys) {
      configuration.targets[additionalTarget] = additionalDomains[additionalTarget]
    }
  }
  return configuration
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
  configuration,
  options
}
