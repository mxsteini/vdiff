const minimist = require('minimist')
const loadJsonFile = require('load-json-file')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
const better = require('./logger')
const prompt = require('prompt')


module.exports = (projectDir, diffToolDir) => {
  const resourcesDir = path.join(diffToolDir, 'resources')
  return {
    configuration () {
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
        better.error('cp ' + path.join(resourcesDir, 'misc', 'configuration.dist.json') + ' ' + path.join(projectDir, 'configuration.json'))
        better.error('and a yaml file for further tests')
        better.error('cp ' + path.join(resourcesDir, 'misc', 'test.dist.yaml') + ' ' + path.join(projectDir, 'tests', 'test.yaml'))

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
          if (!configuration.targets[additionalTarget]['target']) {
            configuration.targets[additionalTarget]['target'] = configuration.default.target
          }
          if (!configuration.targets[additionalTarget]['initialActions']) {
            if (configuration.default.initialActions) {
              configuration.targets[additionalTarget]['initialActions'] = configuration.default.initialActions
            }
          }
        }
      }
      return configuration
    },

    options (configuration) {
      return minimist(process.argv.slice(2), {
        string: ['additionalDomains', 'target1', 'target2', 'conc', 'domain', 'mode', 'skipTarget', 'browser', 'debug', 'url', 'depth', 'testName'],
        default: {
          skipTarget: process.env.NODE_SKIP_TARGET || '',
          conc: process.env.NODE_CONC || 5,
          mode: process.env.NODE_MODE || 'screenshots',
          browser: process.env.NODE_BROWSER || configuration.default.browser || 'fullpage',
          domain: process.env.NODE_DOMAIN || configuration.default.domain || '_all_',
          target1: process.env.NODE_TARGET1 || configuration.default.target1 || 'live',
          target2: process.env.NODE_TARGET2 || configuration.default.target2 || 'dev',
          debug: process.env.NODE_DEBUG || configuration.default.debug || 0,
          depth: process.env.NODE_DEPTH || 3,
          testName: process.env.NODE_TEST_NAME || 'sitemap',
          url: process.env.NODE_URL || '',
        },
        unknown: (input) => {
          better.error('unknown option: ' + input)
          process.exit()
        }
      })
    }
  }
}
