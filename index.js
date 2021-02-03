const fs = require('fs')
const puppeteer = require('puppeteer')
const fsExtra = require('fs-extra')
const queue = require('queue')
let minimist = require('minimist')
const loadJsonFile = require('load-json-file')
let replace = require('stream-replace')
const jimp = require('jimp')
const Mustache = require('mustache')
const { CustomInstance } = require('better-logging')
const betterLogging = CustomInstance(console)
const { performance } = require('perf_hooks')
const path = require('path')


const better = {}
betterLogging(better)


const diffToolDir = path.dirname(__filename)
const resourcesDir = path.join(diffToolDir, 'resources')
const templatesDir = path.join(resourcesDir, 'templates')

const projectDir = __dirname + '/'
const tempDir = projectDir + 'tmp/'

let configuration = loadJsonFile.sync(projectDir + 'configuration.json')
var options = minimist(process.argv.slice(2), {
  string: ['target1', 'target2', 'conc', 'domain', 'single', 'class', 'skipTarget', 'mode', 'browser', 'debug'],
  default: {
    mode: process.env.NODE_MODE || 'list',
    skipTarget: process.env.NODE_SKIP_TARGET || '',
    conc: process.env.NODE_CONC || 5,
    class: process.env.NODE_CLASS || '',
    single: process.env.NODE_SINGLE || '',
    browser: process.env.NODE_browser || configuration.default.browser || 'fullpage',
    domain: process.env.NODE_DOMAIN || configuration.default.domain || '_all_',
    target1: process.env.NODE_TARGET1 || configuration.default.target1 || 'live',
    target2: process.env.NODE_TARGET2 || configuration.default.target2 || 'dev',
    debug: process.env.NODE_TARGET2 || configuration.default.debug || 0
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
q.concurrency = 4
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
  createDiffList()
  better.info('runtests - ', 'finished')
  for (let browserName of browsers) {
    if ((await browser[browserName].pages()).length > 0) {
      browser[browserName].close()
    }
  }
})

function createDirectoryStructur () {
  for (let domain in configuration['targets']) {
    for (let browserName in configuration['browser']) {
      let workDir = path.join(tempDir, domain, browserName)
      fsExtra.ensureDirSync(path.join(workDir, 'diff'))
      fsExtra.ensureDirSync(path.join(workDir, 'html'))
      for (let key in configuration['targets'][domain].target) {
        fsExtra.ensureDirSync(path.join(workDir, key))
      }
    }
  }
}

function distributeHtmlFiles () {
  let domainList = []
  for (let domain in configuration['targets']) {
    domainList.push({
      target: 'domain',
      title: domain,
      href: './' + domain + '/index.html'
    })
    let browserList = []
    for (let browserName in configuration['browser']) {
      browserList.push({
        target: 'browser',
        title: browserName,
        href: './' + browserName + '/index.html'
      })

      data.index = {
        'target': 'diffList',
        'href': './diffList.html'
      }
      data.target = {
        'target': 'diff',
        'href': ''
      }
      let framesetTemplate = fs.readFileSync(path.join(templatesDir, 'diffFrameset.html'), 'utf8')
      let framesetHTML = Mustache.render(framesetTemplate, { data: data })
      fs.writeFileSync(path.join(tempDir, domain, browserName, '/index.html'), framesetHTML)
    }
    let framesetTemplate = fs.readFileSync(path.join(templatesDir, 'indexFrameset.html'), 'utf8')
    data.index = {
      'target': 'browserList',
      'href': './browserList.html'
    }
    data.target = {
      'target': 'browser',
      'href': ''
    }
    let framesetHTML = Mustache.render(framesetTemplate, { data: data })
    fs.writeFileSync(path.join(tempDir, domain, 'index.html'), framesetHTML)

    let indexListTemplate = fs.readFileSync(path.join(templatesDir, 'linkIndex.html'), 'utf8')
    let indexListHTML = Mustache.render(indexListTemplate, { linkList: browserList, data: data })
    fs.writeFileSync(path.join(projectDir, 'tmp', domain, '/browserList.html'), indexListHTML)
  }


  let framesetTemplate = fs.readFileSync(path.join(templatesDir, 'indexFrameset.html'), 'utf8')
  data.index = {
    'target': 'domainList',
    'href': './domainList.html'
  }
  data.target = {
    'target': 'domain',
    'href': ''
  }
  let framesetHTML = Mustache.render(framesetTemplate, { data: data })
  fs.writeFileSync(path.join(tempDir, 'index.html'), framesetHTML)

  let indexListTemplate = fs.readFileSync(path.join(templatesDir, 'linkIndex.html'), 'utf8')
  let indexListHTML = Mustache.render(indexListTemplate, { linkList: domainList, data: data })
  fs.writeFileSync(path.join(tempDir, 'domainList.html'), indexListHTML)
}

function createDiffList () {
  for (let browserName of browsers) {
    for (let domain of domains) {
      let workDir = path.join(tempDir, domain, browserName)
      let diffList = {
        initials: [],
        steps: []
      }
      if (!!configuration['targets'][domain]['initialActions']) {
        if (configuration['targets'][domain]['initialActions'].path) {
          let stepCounter = 0
          let filename = 'initial'
          for (let step of configuration['targets'][domain]['initialActions']['steps']) {
            diffList.initials.push({
              stepName: filename + '_' + (stepCounter),
              diffHtml:  path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'),
              diffImage: path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png')
            })
            stepCounter++
          }
        }
      }
      for (let singleTest of configuration['targets'][domain]['list']) {
        let test = {}
        if (typeof singleTest == 'string') {
          test = {
            steps: [{ action: 'none' }],
            path: singleTest,
          }
        } else {
          test = singleTest
        }
        let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
        let stepCounter = 0
        for (let step of test.steps) {
          diffList.steps.push({
            stepName: filename + '_' + (stepCounter),
            diffHtml:  path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'),
            diffImage: path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png')
          })
          stepCounter++
        }
      }
      let diffListTemplate = fs.readFileSync(path.join(templatesDir, 'diffList.html'), 'utf8')
      let diffListHtml = Mustache.render(diffListTemplate, { diffList: diffList, data: data })
      fs.writeFileSync(path.join(workDir, 'diffList.html'), diffListHtml)
    }
  }
}

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

  // createDiffList()
  // return
  createDirectoryStructur()

  distributeHtmlFiles()
  // return

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

                    let filePath = path.join (workDir, target.target, filename + '_' + (stepCounter++) + '.png')
                    await processAction(page, singleTest, filePath, configuration.browser[browserName].height)
                  }
                  await page.close()
                }
                let stepCounter = 0
                for (let step of configuration['targets'][domain]['initialActions']['steps']) {
                  q.push(function () {
                    return createDiff(
                      workDir,
                      filename + '_' + (stepCounter++),
                      step, target1url, target2url
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
                        let filePath = path.join (workDir, target.target, filename + '_' + (stepCounter++) + '.png')

                        await processAction(page, step, filePath, configuration.browser[browserName].height)
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
                    createDiff(
                      workDir,
                      filename + '_' + (stepCounter++),
                      step, target1url, target2url
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

/**
 *
 * @param workDir
 * @param filename
 * @param singleTest
 * @param target1url
 * @param target2url
 * @returns {Promise<unknown[] | void>}
 */
function createDiff (workDir, filename, singleTest, target1url, target2url) {
  let target1FileName = path.join(workDir, options.target1, filename + '.png')
  let target2FileName = path.join(workDir, options.target2, filename + '.png')
  let diffImage = path.join(workDir, 'diff/', filename + '.png')
  return Promise.all([
    jimp.read(target1FileName),
    jimp.read(target2FileName)
  ]).then(images => {
    let diffHtml = path.join(workDir, 'html', filename + '.html')

    let diffTemplate = fs.readFileSync(path.join(templatesDir, 'diff.html'), 'utf8')
    let diffHTML = Mustache.render(diffTemplate, {
      target1url: target1url + singleTest.path,
      target2url: target2url + (singleTest.path2 ? singleTest.path2 : singleTest.path),
      target1: options.target1,
      target2: options.target2,
      image1: target1FileName,
      image2: target2FileName,
      data: data
    })
    fs.writeFileSync(diffHtml, diffHTML)

    const diff = jimp.diff(images[0], images[1])
    return diff.image.writeAsync(diffImage)
  })
    .catch(err => console.log('runtests: 295', err))
}

/**
 *
 * @param page
 * @param step
 * @param filePath
 * @param height
 * @returns {Promise<void>}
 */
async function processAction (page, step, filePath, height) {
  const error = []
  switch (step.action) {
    case null:
    case '':
    case 'none':
      break
    case 'hover':
      await page.hover(step.action_selector)
        .catch(err => {
          better.warn('processStep: ' + step.action)
          better.warn(page._target._targetInfo.url)
          console.warn(err)
        })
      break
    case 'click':
      await page.click(step.action_selector)
        .catch(err => {
          better.warn('processStep: ' + step.action)
          better.warn(page._target._targetInfo.url)
          console.log(err)
        })
      break
    case 'focus':
      await page.focus(step.action_selector)
        .catch(err => {
          better.warn('processStep: ' + step.action)
          better.warn(page._target._targetInfo.url)
          console.warn(err)
        })
      break
    case 'key':
      await page.keyboard.type(step.action_selector)
        .catch(err => {
          better.warn('processStep: ' + step.action)
          better.warn(page._target._targetInfo.url)
          console.warn(err)
        })
      break
    case 'press':
      await page.keyboard.press(step.action_selector)
        .catch(err => {
          better.warn('processStep: ' + step.action)
          better.warn(page._target._targetInfo.url)
          console.warn(err)
        })
      break
    default:
      better.error('unknown action: ' + step.action)
  }

  if (step.waitFor) {
    await page.waitForTimeout(parseInt(step.waitFor))
      .catch(err => {
        err.action = 'processStep: waitFor'
        error.push(err)
      })
  }
  await page.screenshot({ path: filePath, fullPage: (height == 0 ? true : false) })
}

module.exports = run