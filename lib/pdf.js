const fsExtra = require('fs-extra')
const fs = require('fs')
const path = require('path')
const templateHelper = require('./templateHelper')
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

  return new jimp(image0.bitmap.width + image1.bitmap.width + image2.bitmap.width, height,  async (err, output) => {
    output.blit(image0, 0, 0)
    output.blit(image1, image0.bitmap.width, 0)
    output.blit(image2, image0.bitmap.width + image1.bitmap.width, 0)
    if (output.bitmap.width > output.bitmap.height) {
      output.rotate(90)
    }
    output.write(outputFile)
  })
}

const renderPdf = async (content, output) => {
  let pdfTemplate = fs.readFileSync(path.join(templatesDir, 'pdf.html'), 'utf8')

  let diffHTML = Mustache.render(pdfTemplate, {
    imageList: content,
    data: data
  })
  fs.writeFileSync(output + '.html', diffHTML)
  const puppeteerConfig = {
    ignoreHTTPSErrors: true,
    keepBrowserState: true,
    headless: true,
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
}

create = async (configuration, browserName, domains, tempDir, options) => {
  fsExtra.ensureDirSync(path.join(path.join(tempDir, 'temp')))
  let pages = []
  for (let domain of domains) {
    better.info('collect pages of: ' + domain)
    let workDir = path.join(tempDir, domain, browserName)
    if (!!configuration['targets'][domain]['initialActions']) {
      if (configuration['targets'][domain]['initialActions'].path) {
        let stepCounter = 0
        for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
          let filename = 'initial'
          let screenshots = []
          let image = []
          for (let target of [options.target1, options.target2]) {
            screenshots.push(path.join(workDir, target, filename + '_' + (stepCounter) + '.png'))
          }
          screenshots.push(path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png'))
          let outputFile = path.join(tempDir, 'temp', filename + '_' + (stepCounter) + '.png')
          await compileOutput(screenshots, outputFile, 'initial_' + (stepCounter) + '.png')
          image['file'] = outputFile
          image['title'] =  'Initial - ' + 'Step:' + (stepCounter)
          pages.push(image)
          stepCounter++
        }
      }
    }
    for (let singleTest of configuration['targets'][domain]['list']) {
      let test = templateHelper.createSingleTest(singleTest, options)
      let stepCounter = 0
      for (let step of test.steps) {
        let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
        let screenshots = []
        let image = []
        for (let target of [options.target1, options.target2]) {
          let filePath = path.join(workDir, target, filename + '_' + (stepCounter) + '.png')
          screenshots.push(filePath)
        }
        screenshots.push(path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png'))

        let outputFile = path.join(tempDir, 'temp', filename + '_' + (stepCounter) + '.png')
        await compileOutput(screenshots, outputFile, filename + '_' + (stepCounter) + '.png')
        image['file'] = outputFile
        image['title'] = test.path + ' - ' + 'Step:' + (stepCounter)
        pages.push(image)
        stepCounter++
      }
    }
    better.info('writing pdf: ' + domain)
    await renderPdf(pages, path.join(tempDir, domain))
    better.info('finished pdf in: ' + domain + '.pdf')
  }
}

let templatesDir = ''
let data = []
module.exports = (globalTemplatesDir, globalData) => {
  templatesDir = globalTemplatesDir
  data = globalData
  return {
    create
  }
}
