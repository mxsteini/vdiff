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
    getTargets (sequence) {
      let targets = (typeof configuration.default.target === 'object') ? configuration.default.target : null
      return (typeof configuration['sequences'][sequence].target === 'object') ? configuration['sequences'][sequence].target : targets
    },
    getInitialActions (sequence) {
      let initialActions = (typeof configuration.default.initialActions === 'object') ? configuration.default.initialActions : null
      return (typeof configuration['sequences'][sequence]['initialActions'] === 'object') ? configuration['sequences'][sequence]['initialActions'] : initialActions
    },
    async processAction (page, step, filePath, height) {
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
        case 'type':
          await page.keyboard.type(step.action_input)
            .catch(err => {
              better.warn('processStep: ' + step.action)
              better.warn(page._target._targetInfo.url)
              console.warn(err)
            })
          break
        case 'press':
          await page.keyboard.press(step.action_input)
            .catch(err => {
              better.warn('processStep: ' + step.action)
              better.warn(page._target._targetInfo.url)
              console.warn(err)
            })
          break
        default:
          better.error('unknown action: ' + step.action)
      }

      if (step.waitFor || options.waitFor) {
        await page.waitForTimeout(parseInt(step.waitFor || options.waitFor))
          .catch(err => {
            err.action = 'processStep: waitFor'
            error.push(err)
          })
      }

      const screenshotOptions = {
        type: 'png',
        path: filePath,
      }

      if (step.screenshot !== false) {
        if (typeof step.screenshot == 'object') {
          if (step.screenshot.selector) {
            const element = await page.$(step.screenshot.selector)
            screenshotOptions.clip = await element.boundingBox()
          } else {
            screenshotOptions.clip = step.screenshot
            console.log('funcs: 94', screenshotOptions)
          }
        } else {
          screenshotOptions.fullPage = (height == 0 ? true : false)
        }
        return page.screenshot(screenshotOptions)
          .catch(err => {
            err.action = 'error in taking screenshot'
            error.push(err)
          })
      } else {
        return
      }
    },
    async processTarget (browser, browserName, sequence, workDir, processTargets, testName, test) {
      const page = []
      let promiseCollector = []
      let stepCounter = 0
      let screenshots = []

      better.info('starting Tests: ' + browserName + ' ' + sequence + ' ' + testName + ' steps: ' + test.steps.length)
      for (let target of processTargets) {
        page[target.target] = await browser[browserName][target.target].newPage()
        await page[target.target].setCacheEnabled(true)
        if (!!target.password || target.user) {
          await page[target.target].authenticate({
            username: target.user ? target.user : null,
            password: target.password ? target.password : null
          })
        }
        let targetUrl = (test.url ? test.url : target.url) + test.path
        await page[target.target].goto(targetUrl, {})
          .catch(() => {
            better.error('error in page.goto: ' + targetUrl)
          })
      }
      for (let step of test.steps) {
        let stepName = testName + '_' + (stepCounter)
        better.info('starting step ' + stepName)
        screenshots[options.target1] = path.join(workDir, options.target1, stepName + '.png')
        screenshots[options.target2] = path.join(workDir, options.target2, stepName + '.png')

        for (let target of processTargets) {
          let filePath = path.join(workDir, target.target, stepName + '.png')
          screenshots[target.target] = await this.processAction(page[target.target], step, filePath, configuration.browser[browserName].height, options)
            .catch(() => better.error('process target loop: ' + stepName))
        }

        if (step.screenshot !== false) {
          Promise.all([
            jimp.read(screenshots[options.target1]),
            jimp.read(screenshots[options.target2])
          ])
            .then(images => {
              let diffImage = path.join(workDir, 'diff', stepName + '.png')
              return jimp.diff(images[0], images[1]).image.writeAsync(diffImage)
                .catch(() => better.error('error creating diff for ' + diffImage))
            })
            .catch(() => better.error('error in Promise.all diff for ' + stepName))
        }
        better.info('finish step ' + stepName)
        stepCounter++
      }
      for (let target of processTargets) {
        promiseCollector.push(page[target.target].close())
      }
      return Promise.all(promiseCollector)
        .catch((err) => {
          better.error('error in closing pages')
          console.log('funcs: 145', err)
        })
    }
  }
}
