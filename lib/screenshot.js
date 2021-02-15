const path = require('path')
const better = require('./logger')
const puppeteer = require('puppeteer')
const jimp = require('jimp')

module.exports = (configuration, options, templateHelper) => {
  const funcs = require('./funcs')(options, configuration)

  return {
    create (browser, browserName, domains, tempDir, q) {
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

            for (let domain of domains) {
              let workDir = path.join(tempDir, domain, browserName)
              let processTargets = []

              if (!configuration['sequences'][domain].target && !!configuration.default.target) {
                configuration['sequences'][domain].target = configuration.default.target
              }

              if (!configuration['sequences'][domain]['target'][options.target1]) {
                better.error('Target ' + options.target1 + ' not found in configuration')
                process.exit(1)
              }

              if (!configuration['sequences'][domain]['target'][options.target2]) {
                better.error('Target ' + options.target2 + ' not found in configuration')
                process.exit(1)
              }

              if (options.skipTarget !== '1') {
                processTargets.push({
                  url: configuration['sequences'][domain]['target'][options.target1],
                  target: options.target1
                })
              }
              if (options.skipTarget !== '2') {
                processTargets.push({
                  url: configuration['sequences'][domain]['target'][options.target2],
                  target: options.target2
                })
              }

              for (let target of processTargets) {
                browser[browserName][target.target] = await browser[browserName].browser.createIncognitoBrowserContext()
              }

              if (!!configuration['sequences'][domain]['initialActions']) {
                if (configuration['sequences'][domain]['initialActions'].path) {
                  await funcs.processTarget(browser, browserName, domain, workDir, processTargets, 'initial', configuration['sequences'][domain]['initialActions'])
                }
              }

              better.info('starting tests: ' + browserName + ' ' + domain)
              for (let singleTest of configuration['sequences'][domain]['list']) {
                let test = templateHelper.createSingleTest(singleTest)

                q.push(async function () {
                  let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
                  return await funcs.processTarget(browser, browserName, domain, workDir, processTargets, filename, test)
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
