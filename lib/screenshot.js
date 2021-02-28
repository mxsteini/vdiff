const path = require('path')
const better = require('./logger')
const puppeteer = require('puppeteer')
const jimp = require('jimp')

module.exports = (configuration, options, templateHelper) => {
  const funcs = require('./funcs')(options, configuration)

  return {
    create (browser, browserName, sequences, tempDir, q) {
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
      puppeteer.launch(puppeteerConfig)
        .then(async result => {

            let browserObject = {}
            browserObject.browser = await result
            browser[browserName] = browserObject

            for (let sequenceName of sequences) {
              let workDir = path.join(tempDir, sequenceName, browserName)
              let processTargets = []

              let target1 = options.target1 || configuration.sequences[sequenceName].target1
              let target2 = options.target2 || configuration.sequences[sequenceName].target2

              if (!configuration.sequences[sequenceName].target[target1]) {
                better.error('Target ' + target1 + ' not found in configuration')
                process.exit(1)
              }

              if (!configuration.sequences[sequenceName].target[target2]) {
                better.error('Target ' + target2 + ' not found in configuration')
                process.exit(1)
              }

              if (options.skipTarget !== '1') {
                let target = configuration.sequences[sequenceName].target[target1]
                target['target'] = target1
                processTargets.push(target)
              }
              if (options.skipTarget !== '2') {
                let target = configuration.sequences[sequenceName].target[target2]
                target['target'] = target2
                processTargets.push(target)
              }

              for (let target of processTargets) {
                browser[browserName][target.target] = await browser[browserName].browser.createIncognitoBrowserContext()
              }

              let initialActions = funcs.getInitialActions(sequenceName)
              if (initialActions !== null) {
                let testCounter = 0
                for (let singleTest of initialActions) {
                  let test = templateHelper.createSingleTest(singleTest)
                  let testName = 'initial_' + testCounter.toString().padStart(5, '0')
                  testCounter++
                  await funcs.processTarget(browser, browserName, sequenceName, workDir, processTargets, testName, test)
                }
              }

              let testCounter = 0
              for (let singleTest of configuration['sequences'][sequenceName]['list']) {
                let test = templateHelper.createSingleTest(singleTest)

                q.push(async function () {
                  let testName = 'test_' + testCounter.toString().padStart(5, '0')
                  testCounter++
                  return await funcs.processTarget(browser, browserName, sequenceName, workDir, processTargets, testName, test)
                })
              }
              better.info('waiting for queue')
            }
          }
        )
        .catch(err => console.log('runtests: 249', err))
    }
  }
}
