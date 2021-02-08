const path = require('path')
const templateHelper = require('./templateHelper')
const better = require('./logger')
const funcs = require('./funcs')
const puppeteer = require('puppeteer')

const create = (browser, configuration, browserName, domains, tempDir, options, q) => {
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

          if (!!configuration['targets'][domain]['initialActions']) {
            if (configuration['targets'][domain]['initialActions'].path) {
              better.info('starting Initial: ' + browserName + ' ' + domain)
              for (let target of processTargets) {
                const page = await browser[browserName][target.target].newPage()


                await page.goto(target.url + configuration['targets'][domain]['initialActions'].path,
                  {
                    timeout: 10000,
                    waitUntil: 'networkidle0'
                  }
                )
                  .catch((error) => {
                    better.error('error in page.goto: ' + target.url + configuration['targets'][domain]['initialActions'].path)
                  })

                let stepCounter = 0

                for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
                  let filePath = path.join(workDir, target.target, 'initial_' + (stepCounter++) + '.png')
                  await funcs.processAction(page, singleTest, filePath, configuration.browser[browserName].height, options)
                }
                await page.close()
              }
              let stepCounter = 0
              for (let step of configuration['targets'][domain]['initialActions']['steps']) {
                q.push(function () {
                  return funcs.createDiff(workDir, 'initial_' + (stepCounter++), options)
                })
              }
            }
          }

          better.info('starting tests: ' + browserName + ' ' + domain)
          for (let singleTest of configuration['targets'][domain]['list']) {
            let test = templateHelper.createSingleTest(singleTest, options)

            q.push(async function () {
              let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
              let pageCollector = []
              for (let target of processTargets) {
                pageCollector.push(
                  new Promise(async function (resolve, reject) {
                    const page = await browser[browserName][target.target].newPage()

                    await page.goto(target.url + test.path,
                      {
                        timeout: 30000,
                        waitUntil: 'networkidle0'
                      }
                    )
                      .catch((error) => {
                        console.log('screenshot: 103', error)
                        better.error('error in page.goto: ' + target.url + test.path)
                      })

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
                collector.push(funcs.createDiff(workDir, filename + '_' + (stepCounter++), options))
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

module.exports = {
  create
}
