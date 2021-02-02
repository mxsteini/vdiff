#!/usr/bin/env node
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

const better = {}
betterLogging(better)


const projectDir = __dirname + '/'
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
  'allCss': projectDir + './diff-tool/css/all.css',
  'specCss': ''
}

let browsers = []  // array for brawsernames
let browser = [] // array for browserobjects
let pages = [] // counter for open pages per browser
let pushCounter = 0
let templatesDir = projectDir + 'diff-tool/templates/'
// let target1url = ''
// let target2url = ''
// let processTargets = []
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
  createHTML()
  better.info('runtests - ', 'finished')
  for (let browserName of browsers) {
    if ((await browser[browserName].pages()).length > 0) {
      browser[browserName].close()
    }
  }
})

function createHTML () {
  for (let domain of domains) {
    for (let browserName of browsers) {
      let tempDir = projectDir + 'tmp/' + domain + '/' + browserName + '/'
      fs.createReadStream(templatesDir + 'diffIndex.html')
        .pipe(replace(/%result%/ig, fs.readFileSync(tempDir + 'html/linkList.txt')))
        .pipe(fs.createWriteStream(tempDir + '/diffList.html'))
    }
  }
}

function createDirectoryStructur () {
  for (let domain in configuration['targets']) {
    for (let browserName in configuration['browser']) {
      fsExtra.ensureDirSync(projectDir + 'tmp/' + domain + '/' + browserName + '/diff')
      fsExtra.ensureDirSync(projectDir + 'tmp/' + domain + '/' + browserName + '/html')
      for (let key in configuration['targets'][domain].target) {
        fsExtra.ensureDirSync(projectDir + 'tmp/' + domain + '/' + browserName + '/' + key)
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
      let framesetTemplate = fs.readFileSync(projectDir + '/diff-tool/templates/diffFrameset.html', 'utf8')
      let framesetHTML = Mustache.render(framesetTemplate, { data: data })
      fs.writeFileSync(projectDir + '/tmp/' + domain + '/' + browserName + '/index.html', framesetHTML)
      // let linkList = []
      // if (!! configuration['targets'][domain]['initialActions']['path']) {
      //   let step = 0
      //   let tempDir = projectDir + 'tmp/' + domain + '/' + browserName + '/'
      //   for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
      //     let filename = 'initial_' + step++
      //     let link = createImageLinks(tempDir, filename)
      //     linkList.push(link)
      //   }
      // }

    }
    let framesetTemplate = fs.readFileSync(projectDir + '/diff-tool/templates/indexFrameset.html', 'utf8')
    data.index = {
      'target': 'browserList',
      'href': './browserList.html'
    }
    data.target = {
      'target': 'browser',
      'href': ''
    }
    let framesetHTML = Mustache.render(framesetTemplate, { data: data })
    fs.writeFileSync(projectDir + '/tmp/' + domain + '/index.html', framesetHTML)

    let indexListTemplate = fs.readFileSync(projectDir + './diff-tool/templates/linkIndex.html', 'utf8')
    let indexListHTML = Mustache.render(indexListTemplate, { linkList: browserList, data: data })
    fs.writeFileSync(projectDir + '/tmp/' + domain + '/browserList.html', indexListHTML)
  }


  let framesetTemplate = fs.readFileSync(projectDir + '/diff-tool/templates/indexFrameset.html', 'utf8')
  data.index = {
    'target': 'domainList',
    'href': './domainList.html'
  }
  data.target = {
    'target': 'domain',
    'href': ''
  }
  let framesetHTML = Mustache.render(framesetTemplate, { data: data })
  fs.writeFileSync(projectDir + '/tmp/index.html', framesetHTML)

  let indexListTemplate = fs.readFileSync(projectDir + './diff-tool/templates/linkIndex.html', 'utf8')
  let indexListHTML = Mustache.render(indexListTemplate, { linkList: domainList, data: data })
  fs.writeFileSync(projectDir + '/tmp/domainList.html', indexListHTML)
}

function createImageLinks (tempDir, filename) {
  let diffImage = tempDir + 'diff/' + filename + '.png'
  let diffHtml = tempDir + 'html/' + filename + '.html'

  let diffLink = '<div>' +
    filename + '<br>' +
    '<a href="' + diffHtml + '" target="diff">' +
    '<img width="200" src="' + diffImage + '" />' +
    '</a></div>'
  return diffLink
}

function main () {
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
  // createHTML()
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
            let tempDir = projectDir + 'tmp/' + domain + '/' + browserName + '/'
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

            if (fs.existsSync(tempDir + '/html/linkList.txt')) {
              fs.unlinkSync(tempDir + '/html/linkList.txt')
            }
            if (!!configuration['targets'][domain]['initialActions']) {
              if (configuration['targets'][domain]['initialActions'].path) {
                better.info('starting Initial: ' + browserName + ' ' + domain)
                for (let target of processTargets) {
                  const page = await browser[browserName].newPage()
                  await page.goto(target.url + configuration['targets'][domain]['initialActions'].path)
                  let step = 0

                  for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
                    let filename = 'initial_' + step++

                    let filePath = tempDir + target.target + '/' + filename + '.png'
                    await processAction(page, singleTest, filePath, configuration.browser[browserName].height)
                  }
                  await page.close()
                }
                let step = 0
                for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
                  let filename = 'initial_' + step++
                  q.push(function () {
                    return createDiff(tempDir, filename, singleTest, target1url, target2url)
                  })
                }
              }
            }

            better.info('starting tests: ' + browserName + ' ' + domain)
            for (let singleTest of configuration['targets'][domain]['list']) {
              q.push(async function () {
                let path = (typeof singleTest == 'string') ? singleTest : singleTest.path
                let filename = path.replace(/ /g, '_').replace(/\//g, '_')
                for (let target of processTargets) {
                  try {
                    const page = await browser[browserName].newPage()

                    await page.goto(target.url + path)

                    if (typeof singleTest == 'string') {
                      let filePath = tempDir + target.target + '/' + filename + '.png'
                      await processAction(page, {
                        path: path,
                        action: 'none',
                        waitFor: 100
                      }, filePath, configuration.browser[browserName].height)
                    } else {
                      let stepCounter = 0
                      for (let step of singleTest.steps) {
                        let filePath = tempDir + target.target + '/' + filename + '_' + (stepCounter++) + '.png'
                        await processAction(page, step, filePath, configuration.browser[browserName].height)
                      }
                    }

                    await page.close()
                  } catch (error) {
                    better.warn('error in getting page')
                    better.warn('browser:' + browserName)
                    better.warn('path:' + target.url + path)
                    console.log(error)
                  }
                }

                if (typeof singleTest == 'string') {
                  return createDiff(tempDir, filename, {
                    path: path,
                    action: 'none'
                  }, target1url, target2url)
                } else {
                  let stepCounter = 0
                  for (let step of singleTest.steps) {
                    step.path = singleTest.path
                    await createDiff(tempDir,
                      filename + '_' + (stepCounter++),
                      step, target1url, target2url)
                  }
                }
                return
              })
            }
          }
        }
      )
      .catch(err => console.log('runtests: 249', err))
  }
}

main()

function createDiff (tempDir, filename, singleTest, target1url, target2url) {
  let target1FileName = tempDir + options.target1 + '/' + filename + '.png'
  let target2FileName = tempDir + options.target2 + '/' + filename + '.png'
  let diffImage = tempDir + 'diff/' + filename + '.png'
  return Promise.all([
    jimp.read(target1FileName),
    jimp.read(target2FileName)
  ]).then(images => {
    let diffHtml = tempDir + 'html/' + filename + '.html'


    let diffTemplate = fs.readFileSync(templatesDir + 'diff.html', 'utf8')
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

    let diffLink = '<div>' +
      filename + '<br>' +
      '<a href="' + diffHtml + '" target="diff">' +
      '<img width="200" src="' + diffImage + '" />' +
      '</a></div>' + '\n'

    fs.appendFileSync(tempDir + 'html/linkList.txt', diffLink)

    const diff = jimp.diff(images[0], images[1])
    return diff.image.writeAsync(diffImage)
  })
    .catch(err => console.log('runtests: 295', err))
}

/**
 * @param page
 * @param step
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
