const jimp = require('jimp')
const path = require('path')
const better = require('./logger')

/**
 *
 * @param workDir
 * @param filename
 * @param options
 * @returns {Promise<unknown[] | void>}
 */
const createDiff = (workDir, filename, options) => {
  let target1FileName = path.join(workDir, options.target1, filename + '.png')
  let target2FileName = path.join(workDir, options.target2, filename + '.png')
  let diffImage = path.join(workDir, 'diff/', filename + '.png')
  return Promise.all([
    jimp.read(target1FileName),
    jimp.read(target2FileName)
  ]).then(images => {
    const diff = jimp.diff(images[0], images[1])
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
async function processAction (page, step, filePath, height, options) {
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

  if (step.waitFor || options.waitFor) {
    await page.waitForTimeout(parseInt(step.waitFor || options.waitFor))
      .catch(err => {
        err.action = 'processStep: waitFor'
        error.push(err)
      })
  }
  await page.screenshot({ path: filePath, fullPage: (height == 0 ? true : false) })
    .catch(err => {
      err.action = 'error in taking screenshot'
      error.push(err)
    })
}

module.exports = {
  createDiff,
  processAction
}
