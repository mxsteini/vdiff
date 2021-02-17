const queue = require('queue')
const path = require('path')
const better = require('./lib/logger')


const projectDir = process.cwd()
const diffToolDir = path.dirname(__filename)
const resourcesDir = path.join(diffToolDir, 'resources')
const templatesDir = path.join(resourcesDir, 'templates')
const tempDir = path.join(projectDir, 'tmp')

let data = {
  'projectPath': projectDir,
  'resourcesPath': resourcesDir,
  'allCss': path.join(resourcesDir, 'css/all.css'),
  'specCss': ''
}

const configurationHelper = require('./lib/configurationHelper')(projectDir, diffToolDir)
const configuration = configurationHelper.configuration()
const options = configurationHelper.options(configuration)

const templateHelper = require('./lib/templateHelper')(configuration, options, projectDir, diffToolDir, data)
const sitemap = require('./lib/sitemap')(configuration, options, projectDir)
const crawler = require('./lib/crawler')(configuration, options, projectDir)

const pdf = require('./lib/pdf')(templatesDir, data, templateHelper)
const screenshot = require('./lib/screenshot')(configuration, options, templateHelper)


Error.stackTraceLimit = options.debug

let browser = [] // array for browserobjects
let sequences = []

let q = queue()
q.concurrency = options.conc
q.autostart = 1
q.on('success', function () {
  better.info('remaining: ' + q.length)
})
q.on('end', async function () {
  if (options.sequence === '_all_') {
    for (var key in configuration.targets) {
      sequences.push(key)
    }
  } else {
    sequences.push(options.sequence)
  }
  templateHelper.createDiffList(tempDir, templatesDir, browsers, data, sequences)

  better.info('runtests - ', 'finished')
  for (let browserName of browsers) {
    browser[browserName].browser.close()
  }
  better.line('open file://' + path.join(tempDir, 'index.html'))
})

function run () {
  if (options.sequence === '_all_') {
    for (var key in configuration.targets) {
      sequences.push(key)
    }
  } else {
    sequences.push(options.sequence)
    if (configuration['sequences'][options.sequence]['config']) {
      options.browser = configuration['sequences'][options.sequence]['config']['browser']
      options.waitFor = configuration['sequences'][options.sequence]['config']['waitFor']
    }
  }

  if (options.browser === '_all_') {
    for (var key in configuration.browser) {
      browsers.push(key)
    }
  } else {
    if (typeof options.browser == 'string') {
      browsers.push(options.browser)
    } else {
      browsers = options.browser
    }
  }

  templateHelper.createDirectoryStructur(tempDir)
  templateHelper.distributeHtmlFiles(tempDir, templatesDir)

  switch (options.mode) {
    case 'sitemap':
      sitemap.fetch(options.url, options.depth, options.testName)
      break
    case 'crawl':
      crawler.fetch(options.url, options.depth, options.sequenceName, options.conc)
      break
    default:
      for (let browserName of browsers) {
        switch (options.mode) {
          case 'screenshots':
            screenshot.create(browser, browserName, sequences, tempDir, q)
            break
          case 'pdf':
            pdf.create(configuration, browserName, sequences, tempDir, options)
            break

        }
      }
  }
}

module.exports = run