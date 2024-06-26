const minimist = require('minimist')
const loadJsonFile = require('load-json-file')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
const better = require('./logger')
const glob = require('glob')


module.exports = (projectDir, diffToolDir) => {
  const resourcesDir = path.join(diffToolDir, 'resources')
  return {
    configuration() {
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
        console.log('configurationHelper: 26', error)
        better.error('no configuration found')
        better.error('you can use our template as startingpoint:')
        better.error('cp ' + path.join(resourcesDir, 'misc', 'configuration.dist.json') + ' ' + path.join(projectDir, 'configuration.json'))
        better.error('and a yaml file for further tests')
        better.error('cp ' + path.join(resourcesDir, 'misc', 'test.dist.yaml') + ' ' + path.join(projectDir, 'sequences', 'test.yaml'))

        process.exit(1)
      }

      let files = glob.sync(path.join(projectDir, 'sequences', '**', '*'))

      for (let file of files) {
        let additionalSequencesContent = ''
        try {
          additionalSequencesContent = fs.readFileSync(file, 'utf8')
        } catch (error) {
          console.log('configurationHelper: ', error)
          process.exit(1)
        }

        additionalSequences = []
        try {
          switch (path.extname(file)) {
            case '.yaml':
              additionalSequences = YAML.parse(additionalSequencesContent)
              break
            case '.json':
              additionalSequences = JSON.parse(additionalSequencesContent)
              break
          }
        } catch (error) {
          console.log('configurationHelper: 58', error)
          better.error('error in sequence file: ' + file)
        }

        additionalSequencesKeys = Object.keys(additionalSequences)

        for (let key of additionalSequencesKeys) {
          configuration.sequences[key] = additionalSequences[key]
        }

      }

      return configuration
    },

    options(configuration) {
      let options = minimist(process.argv.slice(2), {
        string: ['target1', 'target2', 'conc', 'sequence', 'mode', 'skipTarget', 'browser', 'debug', 'url', 'depth', 'sequenceName', 'configuration', 'output'],
        default: {
          skipTarget: process.env.NODE_SKIP_TARGET || '',
          conc: process.env.NODE_CONC || 5,
          mode: process.env.NODE_MODE || 'screenshots',
          browser: process.env.NODE_BROWSER || configuration.default.browser || 'fullpage',
          sequence: process.env.NODE_SEQUENCE || configuration.default.sequence || '_all_',
          target1: process.env.NODE_TARGET1,
          target2: process.env.NODE_TARGET2,
          debug: process.env.NODE_DEBUG || configuration.default.debug || 0,
          depth: process.env.NODE_DEPTH || 3,
          sequenceName: process.env.NODE_SEQUENCE_NAME || 'sitemap',
          output: process.env.NODE_OUTPUT || 'local',
          url: process.env.NODE_URL || '',
        },
        unknown: (input) => {
          better.error('unknown option: ' + input)
          process.exit()
        }
      })
      console.logLevel = options.debug
      better.logLevel = options.debug

      configuration.setup.documentRoot = path.resolve(configuration.setup.documentRoot)
      configuration.setup.executablePath = process.env.NODE_EXECUTABLE_PATH || (configuration.setup.executablePath ? path.resolve(configuration.setup.executablePath) : false)
      configuration.setup.maxListeners = process.env.NODE_MAX_LISTENERS || configuration.setup.maxListeners || 10

      return options
    }
  }
}
