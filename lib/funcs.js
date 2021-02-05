const jimp = require('jimp')
const { performance } = require('perf_hooks')
const path = require('path')
const { CustomInstance } = require('better-logging')
const betterLogging = CustomInstance(console)
const better = {}
betterLogging(better)


const createDiff = (workDir, filename, options, singleTest, target1url, target2url) => {
  const t0 = performance.now()
  let target1FileName = path.join(workDir, options.target1, filename + '.png')
  let target2FileName = path.join(workDir, options.target2, filename + '.png')
  let diffImage = path.join(workDir, 'diff/', filename + '.png')
  return Promise.all([
    jimp.read(target1FileName),
    jimp.read(target2FileName)
  ]).then(images => {
    const t1 = performance.now()
    console.log('index: 272 reading files', t1 - t0)

    const diff = jimp.diff(images[0], images[1])
    console.log('index: 286 creating diff', performance.now() - t1)
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

module.exports = {
  createDiff,
  processAction
}
