const queue = require('queue')
const path = require('path')


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

const better = require('./lib/logger')
const configurationHelper = require('./lib/configurationHelper')
const templateHelper = require('./lib/templateHelper')
const pdf = require('./lib/pdf')(templatesDir, data)
const screenshot = require('./lib/screenshot')

const configuration = configurationHelper.configuration(projectDir, resourcesDir)
const options = configurationHelper.options(configuration)
Error.stackTraceLimit = options.debug


let browser = [] // array for browserobjects
let domains = []

let q = queue()
q.concurrency = options.conc
q.autostart = 1
q.on('success', function () {
  better.info('remaining: ' + q.length)
})
q.on('end', async function () {
  if (options.domain === '_all_') {
    for (var key in configuration.targets) {
      domains.push(key)
    }
  } else {
    domains.push(options.domain)
  }
  templateHelper.createDiffList(configuration, tempDir, templatesDir, browsers, data, domains, options)

  better.info('runtests - ', 'finished')
  for (let browserName of browsers) {
    browser[browserName].browser.close()
  }
  better.line('open file://' + path.join(tempDir, 'index.html'))
})

function run () {
  if (options.domain === '_all_') {
    for (var key in configuration.targets) {
      domains.push(key)
    }
  } else {
    domains.push(options.domain)
    if (configuration['targets'][options.domain]['config']) {
      options.browser = configuration['targets'][options.domain]['config']['browser']
      options.waitFor = configuration['targets'][options.domain]['config']['waitFor']
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

  templateHelper.createDirectoryStructur(configuration, tempDir)
  templateHelper.distributeHtmlFiles(configuration, tempDir, templatesDir, projectDir, data)

  for (let browserName of browsers) {
    switch (options.mode) {
      case 'screenshots':
        screenshot.create(browser, configuration, browserName, domains, tempDir, options, q)
        break
      case 'pdf':
        pdf.create(configuration, browserName, domains, tempDir, options)
        break
    }
  }
}

module.exports = run