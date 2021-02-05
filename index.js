const fs = require('fs')
const puppeteer = require('puppeteer')
const fsExtra = require('fs-extra')
const queue = require('queue')
const minimist = require('minimist')
const loadJsonFile = require('load-json-file')
const Mustache = require('mustache')
const { CustomInstance } = require('better-logging')
const betterLogging = CustomInstance(console)
const better = {}
betterLogging(better)

const { performance } = require('perf_hooks')
const path = require('path')
const templateHelper = require('./lib/templateHelper')
const funcs = require('./lib/funcs')


const diffToolDir = path.dirname(__filename)
const resourcesDir = path.join(diffToolDir, 'resources')
const templatesDir = path.join(resourcesDir, 'templates')

const projectDir = process.cwd()
const tempDir = path.join(projectDir, 'tmp')
const configFile = minimist(process.argv.slice(2), {
  string: ['configuration'],
  default: {
    configuration: process.env.NODE_CONFIGURATION || 'configuration.json',
  }
})['configuration']

let configuration = []
if (fs.existsSync(path.join(projectDir, configFile))) {
  configuration = loadJsonFile.sync(path.join(projectDir, 'configuration.json'))
} else {
  better.error('no configuration found')
  better.error('you can use our template as startingpoint:')
  better.error('cp ' + path.join(resourcesDir, 'misc', 'configuration.json.dist') + ' ' + path.join(projectDir, 'configuration.json'))
  process.exit(1)
}

var options = minimist(process.argv.slice(2), {
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

Error.stackTraceLimit = options.debug

let data = {
  'projectPath': projectDir,
  'resourcesPath': resourcesDir,
  'allCss': path.join(resourcesDir, 'css/all.css'),
  'specCss': ''
}

let browsers = []  // array for brawsernames
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
    if ((await browser[browserName].pages()).length > 0) {
      browser[browserName].close()
    }
  }
  better.line('open file://' + path.join(tempDir, 'index.html'))
})

function run () {
  process.setMaxListeners(0)

  if (options.domain === '_all_') {
    for (var key in configuration.targets) {
      domains.push(key)
    }
  } else {
    domains.push(options.domain)
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

  templateHelper.createDiffList(configuration, tempDir, templatesDir, browsers, data, domains, options)
  return
  templateHelper.createDirectoryStructur(configuration, tempDir)
  templateHelper.distributeHtmlFiles(configuration, tempDir, templatesDir, projectDir, data)

  for (let browserName of browsers) {

    const puppeteerConfig = {
      ignoreHTTPSErrors: true,
      keepBrowserState: true,
      headless: true,
      args: [
        '--incognito'
      ],
      defaultViewport: {
        width: parseInt(configuration.browser[browserName].width) || 0,
        height: parseInt(configuration.browser[browserName].height) || 0,
        deviceScaleFactor: parseFloat(configuration.browser[browserName].browser_scalefactor) || 1,
        isMobile: !!configuration.browser[browserName].browser_isMobile,
        hasTouch: !!configuration.browser[browserName].browser_hasTouch,
        isLandscape: !!configuration.browser[browserName].browser_isLandscape
      }
    }

    puppeteer.launch(puppeteerConfig)
      .then(async result => {
          browser[browserName] = result

          for (let domain of domains) {
            let workDir = path.join(tempDir, domain, browserName)
            let processTargets = []

            let target1url = configuration['targets'][domain]['target'][options.target1]
            let target2url = configuration['targets'][domain]['target'][options.target2]

            if (options.skipTarget !== '1') {
              processTargets.push({
                url: configuration['targets'][domain]['target'][options.target1],
                target: options.target1
              })
            }
            if (options.skipTarget !== '2') {
              processTargets.push({
                url: configuration['targets'][domain]['target'][options.target2],
                target: options.target2
              })
            }

            if (!!configuration['targets'][domain]['initialActions']) {
              if (configuration['targets'][domain]['initialActions'].path) {
                let filename = 'initial'
                better.info('starting Initial: ' + browserName + ' ' + domain)
                for (let target of processTargets) {
                  const page = await browser[browserName].newPage()
                  await page.set
                  await page.goto(target.url + configuration['targets'][domain]['initialActions'].path)
                  let stepCounter = 0

                  for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
                    let filePath = path.join(workDir, target.target, filename + '_' + (stepCounter++) + '.png')
                    const t1 = performance.now()
                    await funcs.processAction(page, singleTest, filePath, configuration.browser[browserName].height)
                    console.log('index: 180', performance.now() - t1)
                  }
                  await page.close()
                }
                let stepCounter = 0
                for (let step of configuration['targets'][domain]['initialActions']['steps']) {
                  q.push(function () {
                    return funcs.createDiff(
                      workDir,
                      filename + '_' + (stepCounter++), options,
                      configuration['targets'][domain]['initialActions'], target1url, target2url
                    )
                  })
                }
              }
            }

            better.info('starting tests: ' + browserName + ' ' + domain)
            for (let singleTest of configuration['targets'][domain]['list']) {
              let test = {}
              if (typeof singleTest == 'string') {
                test = {
                  steps: [{ action: 'none' }],
                  path: singleTest,
                  waitfor: options.waitfor ? options.waitfor : 0
                }
              } else {
                test = singleTest
              }
              q.push(async function () {
                let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
                let pageCollector = []
                for (let target of processTargets) {
                  pageCollector.push(
                    new Promise(async function (resolve, reject) {
                      const page = await browser[browserName].newPage()

                      await page.goto(target.url + test.path)

                      let stepCounter = 0
                      for (let step of test.steps) {
                        let filePath = path.join(workDir, target.target, filename + '_' + (stepCounter++) + '.png')

                        await funcs.processAction(page, step, filePath, configuration.browser[browserName].height)
                      }
                      await page.close()
                      resolve()
                    })
                  )
                }
                await Promise.all(pageCollector)

                let collector = []
                let stepCounter = 0
                for (let step of test.steps) {
                  collector.push(
                    funcs.createDiff(
                      workDir,
                      filename + '_' + (stepCounter++), options,
                      test, target1url, target2url
                    ))
                }
                return Promise.all(collector)
              })
            }
            better.info('waiting for queue')
          }
        }
      )
      .catch(err => console.log('runtests: 249', err))
  }
}

module.exports = run