const path = require('path')
const better = require('./logger')
const puppeteer = require('puppeteer')

module.exports = (configuration, options, templateHelper) => {
  const funcs = require('./funcs')(options, configuration)

  return {
    create(browser, browserNames, sequencesName, tempDir, q) {
      better.info('start sequence: ' + sequencesName)

      for (let browserName of configuration.sequences[sequencesName].browser) {
        const puppeteerConfig = {
          ignoreHTTPSErrors: true,
          keepBrowserState: true,
          headless: 'new',
          ignoreDefaultArgs: ['--disable-dev-shm-usage'],
          executablePath: configuration.setup.executablePath || '',
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
              q.push(async function () {

                let browserObject = {}
                browserObject.browser = await result
                if (!browser[sequencesName]) {
                  browser[sequencesName] = []
                }
                browser[sequencesName][browserName] = browserObject

                let workDir = path.join(tempDir, sequencesName, browserName)
                let processTargets = []

                let target1 = options.target1 || configuration.sequences[sequencesName].target1
                let target2 = options.target2 || configuration.sequences[sequencesName].target2

                if (!configuration.sequences[sequencesName].target[target1]) {
                  better.info(sequencesName + '-' + browserName + ': Target ' + target1 + ' not found in configuration')
                  process.exit(1)
                }

                if (!configuration.sequences[sequencesName].target[target2]) {
                  better.error(sequencesName + '-' + browserName + ': Target ' + target2 + ' not found in configuration')
                  process.exit(1)
                }

                if (options.skipTarget !== '1') {
                  let target = configuration.sequences[sequencesName].target[target1]
                  target['target'] = target1
                  processTargets.push(target)
                }
                if (options.skipTarget !== '2') {
                  let target = configuration.sequences[sequencesName].target[target2]
                  target['target'] = target2
                  processTargets.push(target)
                }

                for (let target of processTargets) {
                  browser[sequencesName][browserName][target.target] = await browser[sequencesName][browserName].browser.createIncognitoBrowserContext()
                }

                let initialActions = funcs.getInitialActions(sequencesName)
                if (initialActions !== null) {
                  let testCounter = 0
                  for (let singleTest of initialActions) {
                    let test = templateHelper.createSingleTest(singleTest)
                    let testName = 'initial_' + testCounter.toString().padStart(5, '0')
                    testCounter++
                    await funcs.processTarget(browser, browserName, sequencesName, workDir, processTargets, testName, test)
                  }
                }

                let testCounter = 0
                for (let singleTest of configuration['sequences'][sequencesName]['list']) {
                  let test = templateHelper.createSingleTest(singleTest)

                  better.info(sequencesName + '-' + browserName + ': adding test')
                  let testName = 'test_' + testCounter.toString().padStart(5, '0')
                  testCounter++
                  await funcs.processTarget(browser, browserName, sequencesName, workDir, processTargets, testName, test, true)
                }
                better.info(sequencesName + '-' + browserName + ': waiting for queue')
              })
            }
          )
          .catch(err => console.log('runtests: 249', err))

      }
    }
  }
}
