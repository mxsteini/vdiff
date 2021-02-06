const puppeteer = require('puppeteer')
const queue = require('queue')
const fs = require('fs')
const imgToPDF = require('image-to-pdf')

const { CustomInstance } = require('better-logging')
const betterLogging = CustomInstance(console)
const better = {}
const configurationHelper = require('./lib/configurationHelper')
betterLogging(better)

// const { performance } = require('perf_hooks')
const path = require('path')
const templateHelper = require('./lib/templateHelper')
const funcs = require('./lib/funcs')


const diffToolDir = path.dirname(__filename)
const resourcesDir = path.join(diffToolDir, 'resources')
const templatesDir = path.join(resourcesDir, 'templates')

const projectDir = process.cwd()
const tempDir = path.join(projectDir, 'tmp')

const configuration = configurationHelper.configuration(projectDir, resourcesDir)
const options = configurationHelper.options(configuration)
Error.stackTraceLimit = options.debug

let data = {
  'projectPath': projectDir,
  'resourcesPath': resourcesDir,
  'allCss': path.join(resourcesDir, 'css/all.css'),
  'specCss': ''
}

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

    const puppeteerConfig = {
      ignoreHTTPSErrors: true,
      keepBrowserState: true,
      headless: true,
      defaultViewport: {
        width: parseInt(configuration.browser[browserName].width) || 0,
        height: parseInt(configuration.browser[browserName].height) || 0,
        deviceScaleFactor: parseFloat(configuration.browser[browserName].browser_scalefactor) || 1,
        isMobile: !!configuration.browser[browserName].browser_isMobile,
        hasTouch: !!configuration.browser[browserName].browser_hasTouch,
        isLandscape: !!configuration.browser[browserName].browser_isLandscape
      }
    }

    switch (options.mode) {
      case 'screenshots':
        puppeteer.launch(puppeteerConfig)
          .then(async result => {
              let browserObject = {}
              browserObject.browser = await result
              browser[browserName] = browserObject

              for (let domain of domains) {
                let workDir = path.join(tempDir, domain, browserName)
                let processTargets = []

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

                for (let target of processTargets) {
                  browser[browserName][target.target] = await browser[browserName].browser.createIncognitoBrowserContext()
                }

                if (!!configuration['targets'][domain]['initialActions']) {
                  if (configuration['targets'][domain]['initialActions'].path) {
                    let filename = 'initial'
                    better.info('starting Initial: ' + browserName + ' ' + domain)
                    for (let target of processTargets) {
                      const page = await browser[browserName][target.target].newPage()

                      await page.goto(target.url + configuration['targets'][domain]['initialActions'].path)
                      let stepCounter = 0

                      for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
                        let filePath = path.join(workDir, target.target, filename + '_' + (stepCounter++) + '.png')
                        await funcs.processAction(page, singleTest, filePath, configuration.browser[browserName].height, options)
                      }
                      await page.close()
                    }
                    let stepCounter = 0
                    for (let step of configuration['targets'][domain]['initialActions']['steps']) {
                      q.push(function () {
                        return funcs.createDiff(workDir, filename + '_' + (stepCounter++), options)
                      })
                    }
                  }
                }

                better.info('starting tests: ' + browserName + ' ' + domain)
                for (let singleTest of configuration['targets'][domain]['list']) {
                  let test = createSingleTest(singleTest)

                  q.push(async function () {
                    let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
                    let pageCollector = []
                    for (let target of processTargets) {
                      pageCollector.push(
                        new Promise(async function (resolve, reject) {
                          const page = await browser[browserName][target.target].newPage()

                          await page.goto(target.url + test.path)

                          let stepCounter = 0
                          for (let step of test.steps) {
                            let filePath = path.join(workDir, target.target, filename + '_' + (stepCounter++) + '.png')

                            await funcs.processAction(page, step, filePath, configuration.browser[browserName].height, options)
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
                        funcs.createDiff(workDir, filename + '_' + (stepCounter++), options))
                    }
                    return Promise.all(collector)
                  })
                }
                better.info('waiting for queue')
              }
            }
          )
          .catch(err => console.log('runtests: 249', err))
        break
      case 'pdf':
        let pages = []
        for (let domain of domains) {
          let workDir = path.join(tempDir, domain, browserName)

          if (!!configuration['targets'][domain]['initialActions']) {
            if (configuration['targets'][domain]['initialActions'].path) {
              let filename = 'initial'
              let stepCounter = 0
              for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
                for (let target of [options.target1, options.target2]) {
                  let filePath = path.join(workDir, target, filename + '_' + (stepCounter) + '.png')
                  pages.push(filePath)
                }
                stepCounter++
              }
            }
          }
          for (let singleTest of configuration['targets'][domain]['list']) {
            let test = templateHelper.createSingleTest(singleTest)
            let stepCounter = 0
            for (let step of test.steps) {
              let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
              for (let target of [options.target1, options.target2]) {
                let filePath = path.join(workDir, target, filename + '_' + (stepCounter) + '.png')
                pages.push(filePath)
               }
              stepCounter++
            }
          }
        }
        imgToPDF(pages, 'A4').pipe(fs.createWriteStream('output.pdf'));
        break
    }
  }
}

module.exports = run