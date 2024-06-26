const { setTimeout: setTimeoutPromiseBased } = require('timers/promises');

const jimp = require('jimp')
const path = require('path')
const better = require('./logger')


/**
 *
 * @param options
 * @param configuration
 * @returns {{processAction(*, *, *=, *): Promise<*>, processTarget(*, *, *, *=, *, *, *): Promise<unknown[]>}|Promise<unknown[]>|Promise<any>}
 */
module.exports = (options, configuration) => {
  return {
    getTargets(sequence) {
      let targets = (typeof configuration.default.target === 'object') ? configuration.default.target : null
      return (typeof configuration['sequences'][sequence].target === 'object') ? configuration['sequences'][sequence].target : targets
    },
    getInitialActions(sequence) {
      let initialActions = (typeof configuration.default.initialActions === 'object') ? configuration.default.initialActions : null
      return (typeof configuration['sequences'][sequence]['initialActions'] === 'object') ? configuration['sequences'][sequence]['initialActions'] : initialActions
    },
    async processAction(page, step, filePath, height) {
      return new Promise(
        async function (resolve, reject) {
          const error = []

          switch (step.action) {
            case null:
            case '':
            case 'none':
              break
            case 'hover':
              await page.hover(step.action_selector)
                .catch(err => {
                  better.warn('url: ' + page.url())
                  better.warn('processStep: ' + step.action)
                  console.warn(err)
                })
              break
            case 'click':
              await page.click(step.action_selector)
                .catch(err => {
                  better.warn('url: ' + page.url())
                  better.warn('processStep: ' + step.action)
                  console.warn(err)
                })
              break
            case 'focus':
              await page.focus(step.action_selector)
                .catch(err => {
                  better.warn('url: ' + page.url())
                  better.warn('processStep: ' + step.action)
                  console.warn(err)
                })
              break
            case 'type':
              await page.keyboard.type(step.action_input_env ? process.env[step.action_input_env] : step.action_input)
                .catch(err => {
                  better.warn('url: ' + page.url())
                  better.warn('processStep: ' + step.action)
                  console.warn(err)
                })
              break
            case 'press':
              await page.keyboard.press(step.action_input)
                .catch(err => {
                  better.warn('url: ' + page.url())
                  better.warn('processStep: ' + step.action)
                  console.warn(err)
                })
              break
            case 'selectIndex':
              const js =  'document.querySelector("' + step.action_selector + '").selectedIndex = ' + step.action_index
              await page.evaluate(js)
                .catch(err => {
                  better.warn('url: ' + page.url())
                  better.warn('processStep: ' + step.action)
                  console.warn(err)
                })
              break
            default:
              better.error('unknown action: ' + step.action)
          }

          if (step.waitFor || options.waitFor) {
            await setTimeoutPromiseBased(parseInt(step.waitFor || options.waitFor));
          }

          const screenshotOptions = {
            type: 'png',
            path: filePath
          }

          if (step.screenshot !== false) {
            let imageTarget = page
            if (typeof step.screenshot == 'object') {
              if (step.screenshot.selector) {
                imageTarget = await page.$(step.screenshot.selector)
              } else {
                screenshotOptions.clip = step.screenshot
              }
            } else {
              screenshotOptions.fullPage = (height == 0 ? true : false)
            }
            await imageTarget.screenshot(screenshotOptions)
              .catch(err => {
                err.action = 'error in taking screenshot'
                error.push(err)
              })
          }

          resolve()
        }
      )
    },
    async processTarget(browser, browserName, sequenceName, workDir, processTargets, testName, test, close = false) {
      const page = []
      let promiseCollector = []
      let stepCounter = 0
      let screenshots = []
      let target1 = options.target1 || configuration.sequences[sequenceName].target1
      let target2 = options.target2 || configuration.sequences[sequenceName].target2

      better.info(sequenceName + '-' + browserName + ': starting Tests: ' + browserName + ' ' + sequenceName + ' ' + testName + ' steps: ' + test.steps.length)
      for (let target of processTargets) {
        page[target.target] = await browser[sequenceName][browserName][target.target].newPage()
        if (configuration.setup.userAgent && configuration.setup.userAgent != '') {
          await page[target.target].setUserAgent(configuration.setup.userAgent)
        }
        await page[target.target].setCacheEnabled(true)
        if (!!target.password || target.user) {
          await page[target.target].authenticate({
            username: target.user ? target.user : null,
            password: target.password ? target.password : null
          })
        }
        let targetUrl = (test.url ? test.url : target.url) + test.path
        await page[target.target].goto(targetUrl, {'timeout': 10000, 'waitUntil': 'load'})
          .catch((e) => {
            better.error('error in page.goto: ' + targetUrl)
            console.log(e)
          })
      }

      for (let step of test.steps) {
        let stepName = testName + '_' + (stepCounter)
        better.info(sequenceName + '-' + browserName + ': starting step ' + stepName)
        screenshots[target1] = path.join(workDir, target1, stepName + '.png')
        screenshots[target2] = path.join(workDir, target2, stepName + '.png')

        let screenshotsPromises = []
        for (let target of processTargets) {
          let filePath = path.join(workDir, target.target, stepName + '.png')
          screenshotsPromises.push(this.processAction(page[target.target], step, filePath, configuration.browser[browserName].height, options))
        }
        await Promise.all(screenshotsPromises)

        if (step.screenshot !== false) {
          await Promise.all([
            jimp.read(screenshots[target1]),
            jimp.read(screenshots[target2])
          ])
            .then(images => {
              let diffImage = path.join(workDir, 'diff', stepName + '.png')
              return jimp.diff(images[0], images[1]).image.writeAsync(diffImage)
                .catch(() => better.error('error creating diff for ' + diffImage))
            })
            .catch(() => better.error('error in Promise.all diff for ' + stepName))
        }
        better.info(sequenceName + '-' + browserName + ': finish step ' + stepName)
        stepCounter++
      }

      if (close) {
        for (let target of processTargets) {
          promiseCollector.push(page[target.target].close())
        }

        await Promise.all(promiseCollector)
          .catch((err) => {
            better.error('error in closing pages')
            console.log('funcs: 145', err)
          })
      }
    }
  }
}
