const path = require('path')
const better = require('./logger')
const funcs = require('./funcs')
const puppeteer = require('puppeteer')
const jimp = require('jimp')

module.exports = (configuration, options, templateHelper) => {

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

              const page = []
              if (!!configuration['targets'][domain]['initialActions']) {
                if (configuration['targets'][domain]['initialActions'].path) {
                  let promiseCollector = []
                  better.info('starting Initial: ' + browserName + ' ' + domain)
                  for (let target of processTargets) {
                    page[target.target] = await browser[browserName][target.target].newPage()
                    await page[target.target].goto(target.url + configuration['targets'][domain]['initialActions'].path,
                      {
                        timeout: 30000,
                        waitUntil: 'networkidle0'
                      }
                    )
                      .catch((error) => {
                        better.error('error in page.goto: ' + target.url + configuration['targets'][domain]['initialActions'].path)
                      })

                  }

                  let stepCounter = 0
                  let screenshots = []
                  let filename = 'initial'
                  for (let step of configuration['targets'][domain]['initialActions']['steps']) {
                    screenshots[options.target1] = path.join(workDir, options.target1, filename + '_' + (stepCounter) + '.png')
                    screenshots[options.target2] = path.join(workDir, options.target2, filename + '_' + (stepCounter) + '.png')

                    for (let target of processTargets) {
                      let filePath = path.join(workDir, target.target, filename + '_' + (stepCounter) + '.png')
                      screenshots[target.target] = await funcs.processAction(page[target.target], step, filePath, configuration.browser[browserName].height, options)
                        .catch(err => console.log('screenshot: 118', err))
                    }
                    Promise.all([
                      jimp.read(screenshots[options.target1]),
                      jimp.read(screenshots[options.target2])
                    ])
                      .then(images => {
                        return jimp.diff(images[0], images[1]).image.writeAsync(path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png'))
                      })
                      .catch(err => console.log('screenshot: 125', err))
                    stepCounter++
                  }
                  for (let target of processTargets) {
                    promiseCollector.push(page[target.target].close())
                  }
                  await Promise.all(promiseCollector)
                }
              }

              better.info('starting tests: ' + browserName + ' ' + domain)
              for (let singleTest of configuration['targets'][domain]['list']) {
                let test = templateHelper.createSingleTest(singleTest)

                q.push(async function () {
                  let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
                  let promiseCollector = []
                  const page = []
                  for (let target of processTargets) {
                    page[target.target] = await browser[browserName][target.target].newPage()
                    await page[target.target].goto(target.url + test.path,
                      {
                        timeout: 30000,
                        waitUntil: 'networkidle0'
                      }
                    )
                      .catch((error) => {
                        console.log('screenshot: 103', error)
                        better.error('error in page.goto: ' + target.url + test.path)
                      })
                  }

                  let stepCounter = 0
                  let screenshots = []
                  for (let step of test.steps) {
                    screenshots[options.target1] = path.join(workDir, options.target1, filename + '_' + (stepCounter) + '.png')
                    screenshots[options.target2] = path.join(workDir, options.target2, filename + '_' + (stepCounter) + '.png')
                    for (let target of processTargets) {
                      let filePath = path.join(workDir, target.target, filename + '_' + (stepCounter) + '.png')
                      screenshots[target.target] = await funcs.processAction(page[target.target], step, filePath, configuration.browser[browserName].height, options)
                        .catch(err => console.log('screenshot: 118', err))
                    }
                    Promise.all([
                      jimp.read(screenshots[options.target1]),
                      jimp.read(screenshots[options.target2])
                    ])
                      .then(images => {
                        return jimp.diff(images[0], images[1]).image.writeAsync(path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png'))
                      })
                      .catch(err => console.log('screenshot: 125', err))
                    stepCounter++
                  }

                  for (let target of processTargets) {
                    promiseCollector.push(page[target.target].close())
                  }
                  return Promise.all(promiseCollector)
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
