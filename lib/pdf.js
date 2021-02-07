const fs = require('fs')
const imgToPDF = require('image-to-pdf')
const path = require('path')
const templateHelper = require('./templateHelper')
const better = require('./logger')

const create = (configuration, browserName, domains, tempDir, options) => {
  let pages = []
  for (let domain of domains) {
    better.info('collect pages of: ' + domain)
    let workDir = path.join(tempDir, domain, browserName)
    if (!!configuration['targets'][domain]['initialActions']) {
      if (configuration['targets'][domain]['initialActions'].path) {
        let stepCounter = 0
        for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
          for (let target of [options.target1, options.target2]) {
            pages.push(path.join(workDir, target, 'initial_' + (stepCounter) + '.png'))
          }
          stepCounter++
        }
      }
    }
    for (let singleTest of configuration['targets'][domain]['list']) {
      let test = templateHelper.createSingleTest(singleTest, options)
      let stepCounter = 0
      for (let step of test.steps) {
        let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
        for (let target of [options.target1, options.target2]) {
          let filePath = path.join(workDir, target, filename + '_' + (stepCounter) + '.png')
          pages.push(filePath)
        }
        stepCounter++
      }
    }
    better.info('writing pdf: ' + domain)
    imgToPDF(pages, 'A4').pipe(fs.createWriteStream(path.join(tempDir, domain + '.pdf')))
  }
}

module.exports = {
  create
}
