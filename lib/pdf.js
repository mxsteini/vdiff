const fsExtra = require('fs-extra')
const fs = require('fs')
const path = require('path')
const better = require('./logger')
const jimp = require('jimp')
const Mustache = require('mustache')
const puppeteer = require('puppeteer')


const compileOutput = async (screenshots, outputFile, title) => {
  better.info('compiling: ' + outputFile)
  let image0 = await jimp.read(screenshots[0])
  let image1 = await jimp.read(screenshots[1])
  let image2 = await jimp.read(screenshots[2])

  let height = Math.max(
    image0.bitmap.height,
    image1.bitmap.height,
    image2.bitmap.height
  )

  return new jimp(image0.bitmap.width + image1.bitmap.width + image2.bitmap.width, height, async (err, output) => {
    output.blit(image0, 0, 0)
    output.blit(image1, image0.bitmap.width, 0)
    output.blit(image2, image0.bitmap.width + image1.bitmap.width, 0)
    if (output.bitmap.width > output.bitmap.height) {
      output.rotate(90)
    }
    output.write(outputFile)
  })
}


let templatesDir = ''
let data = []
module.exports = (templatesDir, data, templateHelper) => {
  return {
    async renderPdf (templatesDir, content, output) {
      let pdfTemplate = fs.readFileSync(path.join(templatesDir, 'pdf.html'), 'utf8')

      let diffHTML = Mustache.render(pdfTemplate, {
        imageList: content,
        data: data
      })
      fs.writeFileSync(output + '.html', diffHTML)
      const puppeteerConfig = {
        ignoreHTTPSErrors: true,
        keepBrowserState: true,
        headless: 'new',
      }

      await puppeteer.launch(puppeteerConfig)
        .then(async browser => {
          const page = await browser.newPage()
          await page.goto('file://' + output + '.html', { waitUntil: 'networkidle0' })
          await page.pdf({
            path: output + '.pdf',
            format: 'A4'
          })
          await browser.close()
        })
    },
    async create (configuration, browserNames, sequencesName, tempDir, options) {
      const funcs = require('./funcs')(options, configuration)
      let pages = []
      for (let browserName of configuration.sequences[sequencesName].browser) {
        let target1 = options.target1 || configuration.sequences[sequencesName].target1
        let target2 = options.target2 || configuration.sequences[sequencesName].target2
        better.info('collect pages of: ' + sequencesName)
        let workDir = path.join(tempDir, sequencesName, browserName)
        fsExtra.ensureDirSync(path.join(path.join(workDir, 'temp')))

        let initialActions = funcs.getInitialActions(sequencesName)
        if (initialActions !== null) {
          let testCounter = 0
          for (let singleTest of initialActions) {
            let test = templateHelper.createSingleTest(singleTest)
            let filename = 'initial_' + testCounter.toString().padStart(5, '0')
            testCounter++

            let stepCounter = 0
            for (let step of test.steps) {
              if (step.screenshot !== false) {
                let screenshots = []
                let image = []
                for (let target of [target1, target2]) {
                  screenshots.push(path.join(workDir, target, filename + '_' + (stepCounter) + '.png'))
                }
                screenshots.push(path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png'))
                let outputFile = path.join(workDir, 'temp', filename + '_' + (stepCounter) + '.png')
                await compileOutput(screenshots, outputFile, 'initial_' + (stepCounter) + '.png')
                image['file'] = outputFile
                image['title'] = 'Initial - ' + 'Step:' + (stepCounter)
                pages.push(image)
              }
              stepCounter++
            }
          }
        }

        let testCounter = 0
        for (let singleTest of configuration['sequences'][sequencesName]['list']) {
          let test = templateHelper.createSingleTest(singleTest)
          let filename = 'test_' + testCounter.toString().padStart(5, '0')
          testCounter++
          let stepCounter = 0
          for (let step of test.steps) {
            if (step.screenshot !== false) {
              let screenshots = []
              let image = []
              for (let target of [target1, target2]) {
                let filePath = path.join(workDir, target, filename + '_' + (stepCounter) + '.png')
                screenshots.push(filePath)
              }
              screenshots.push(path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png'))

              let outputFile = path.join(workDir, 'temp', filename + '_' + (stepCounter) + '.png')
              await compileOutput(screenshots, outputFile, filename + '_' + (stepCounter) + '.png')
              image['file'] = outputFile
              image['title'] = test.path + ' - ' + 'Step:' + (stepCounter)
              pages.push(image)
            }
            stepCounter++
          }
        }
        better.info('writing pdf: ' + sequencesName)
        await this.renderPdf(templatesDir, pages, path.join(workDir, sequencesName))
        better.info('finished pdf in: ' + path.join(workDir, sequencesName) + '.pdf')
      }
    }

  }
}
