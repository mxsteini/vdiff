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

      // writing to /dev/null is faster ...
      return page.screenshot({
        type: 'png',
        path: filePath,
        fullPage: (height == 0 ? true : false)
      })
        .catch(err => {
          err.action = 'error in taking screenshot'
          error.push(err)
        })
    },
    async processTarget (browser, browserName, sequence, workDir, processTargets, testName, test) {
      const page = []
      let promiseCollector = []
      let stepCounter = 0
      let screenshots = []

      better.info('starting Tests: ' + browserName + ' ' + sequence + ' ' + testName)
      for (let target of processTargets) {
        page[target.target] = await browser[browserName][target.target].newPage()
        await page[target.target].setCacheEnabled(true)
        await page[target.target].goto(target.url + test.path, {})
          .catch(() => {
            better.error('error in page.goto: ' + target.url + configuration['sequences'][sequence]['initialActions'].path)
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
        better.info('finish step ' + stepName)
        stepCounter++
      }
      for (let target of processTargets) {
        promiseCollector.push(page[target.target].close())
      }
      return Promise.all(promiseCollector)
    }
  }
}
