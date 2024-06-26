const queue = require('queue')
const path = require('path')
const os = require('os')
const Sentry = require("@sentry/node");

require('dotenv').config()

const projectDir = process.cwd()
const diffToolDir = path.dirname(__filename)
const resourcesDir = path.join(diffToolDir, 'resources')
const templatesDir = path.join(resourcesDir, 'templates')

const configurationHelper = require('./lib/configurationHelper')(projectDir, diffToolDir)
const configuration = configurationHelper.configuration()
const options = configurationHelper.options(configuration)

const logLevels = ["debug", "log", "warn", "error", "none"];
if (configuration.setup.sentry && configuration.setup.sentry.cdnurl) {

  global.logLevel = options.debug;
  const Sentry = require("@sentry/node");

  Sentry.init({
    dsn: configuration.setup.sentry.cdnurl,
  });

  Sentry.addIntegration(Sentry.captureConsoleIntegration({levels: ['error']}));

} else {
  require('better-logging')(console);
  console.logLevel = logLevels.indexOf(options.debug)
}

require('events').EventEmitter.defaultMaxListeners = configuration.setup.maxListeners


process.removeAllListeners('warning');

let data = {
  'baseUrl': configuration.setup.baseUrl ? configuration.setup.baseUrl : (path.resolve(configuration.setup.documentRoot) + '/'),
  'projectPath': projectDir,
  'resourcesPath': resourcesDir,
  'allCss': path.join(resourcesDir, 'css/all.css'),
  'specCss': ''
}

const templateHelper = require('./lib/templateHelper')(configuration, options, projectDir, diffToolDir, data)
const sitemap = require('./lib/sitemap')(configuration, options, projectDir)
const crawler = require('./lib/crawler')(configuration, options, projectDir)

const pdf = require('./lib/pdf')(templatesDir, data, templateHelper)
const screenshot = require('./lib/screenshot')(configuration, options, templateHelper, console)


// Error.stackTraceLimit = options.debug

let browser = [] // array for browserobjects
let browserNames = [] // array contains list of browsernames to process
let sequencesNames = []

let q = queue()
q.concurrency = options.conc
q.autostart = 1
q.on('success', function () {
  console.log('remaining: ' + q.length)
})
q.on('end', async function () {
  if (options.sequence === '_all_') {
    for (var key in configuration.sequences) {
      sequencesNames.push(key)
    }
  } else {
    options.sequence.split(',').forEach((sequence) =>
      sequencesNames.push(sequence)
    )
  }
  let tempDir = path.resolve(configuration.setup.documentRoot, 'Html')
  templateHelper.createDiffList(tempDir, templatesDir, browserNames, data, sequencesNames)

  console.log('runtests - ', 'finished')
  for (let sequenceName of sequencesNames) {
    for (let browserName of configuration.sequences[sequenceName].browser) {
      browser[sequenceName][browserName].browser.close()
    }
  }
  let openCommand = 'xdg-open'
  switch (os.plattform) {
    case 'darwin':
      openCommand = 'open'
      break
    case 'win32':
      openCommand = 'start'
      break
  }
  global.console.log(openCommand + ' ' + data.baseUrl + path.join('Html', 'index.html'))
})

function run() {
  if (options.sequence === '_all_') {
    for (var key in configuration.sequences) {
      sequencesNames.push(key)
    }
  } else {
    options.sequence.split(',').forEach((sequence) =>
      sequencesNames.push(sequence)
    )
  }

  for (let sequenceName of sequencesNames) {
    for (let defaultValue of Object.keys(configuration.default)) {
      if (!configuration.sequences[sequenceName][defaultValue]) {
        configuration.sequences[sequenceName][defaultValue] = configuration.default[defaultValue]
      }
    }
  }

  if (options.browser === '_all_') {
    for (var key in configuration.browser) {
      browserNames.push(key)
    }
  } else {
    if (typeof options.browser == 'string') {
      browserNames.push(options.browser)
    } else {
      browserNames = options.browser
    }
  }

  templateHelper.createDirectoryStructur(diffToolDir)
  templateHelper.distributeHtmlFiles(templatesDir)

  let outputDir = path.resolve(configuration.setup.documentRoot, 'Html')

  switch (options.mode) {
    case 'sitemap':
      sitemap.fetch(options.url, options.depth, options.sequenceName)
      break
    case 'crawl':
      crawler.fetch(options.url, options.depth, options.sequenceName, options.conc)
      break
    default:
      for (let sequencesName of sequencesNames) {
        switch (options.mode) {
          case 'screenshots':
            screenshot.create(browser, browserNames, sequencesName, outputDir, q)
            break
          case 'pdf':
            pdf.create(configuration, browserNames, sequencesName, outputDir, options)
            break

        }
      }
  }
}

module.exports = run
