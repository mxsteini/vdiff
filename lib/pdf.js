const fsExtra = require('fs-extra')
const fs = require('fs')
const imgToPDF = require('image-to-pdf')
const path = require('path')
const templateHelper = require('./templateHelper')
const better = require('./logger')
const jimp = require('jimp')

const compileOutput = async (screenshots, outputFile, title) => {
  better.info('compiling: ' + outputFile)
  let image0 = await jimp.read(screenshots[0])
  let image1 = await jimp.read(screenshots[1])
  let image2 = await jimp.read(screenshots[2])

  let height = Math.max(
    image0.bitmap.height,
    image1.bitmap.height,
    image2.bitmap.height
  );

  return new jimp(image0.bitmap.width + image1.bitmap.width + image2.bitmap.width, (height + 100), 'green', async (err, output) =>  {
    // jimp.loadFont(jimp.FONT_SANS_32_BLACK).then(font => {
    //   output.print(
    //     font,
    //     10,
    //     10,
    //     title
    //   );
    // });

    output.blit(image0, 0, 0)
    output.blit(image1, image0.bitmap.width, 0)
    output.blit(image2, image0.bitmap.width + image1.bitmap.width, 0)
    if (output.bitmap.width > output.bitmap.height) {
      output.rotate(90)
    }
    output.write(outputFile)
  })
}

const create = async (configuration, browserName, domains, tempDir, options) => {
  fsExtra.ensureDirSync(path.join(path.join(tempDir, 'temp')))
  let pages = []
  for (let domain of domains) {
    better.info('collect pages of: ' + domain)
    let workDir = path.join(tempDir, domain, browserName)
    if (!!configuration['targets'][domain]['initialActions']) {
      if (configuration['targets'][domain]['initialActions'].path) {
        let stepCounter = 0
        for (let singleTest of configuration['targets'][domain]['initialActions']['steps']) {
          let screenshots = []
          for (let target of [options.target1, options.target2]) {
            screenshots.push(path.join(workDir, target, 'initial_' + (stepCounter) + '.png'))
          }
          screenshots.push(path.join(workDir, 'diff' , 'initial_' + (stepCounter) + '.png'))
          let outputFile = path.join(tempDir, 'temp' , 'initial_' + (stepCounter) + '.png')
          await compileOutput(screenshots, outputFile, 'initial_' + (stepCounter) + '.png')
          pages.push(outputFile)
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
        for (let target of [options.target1, options.target2]) {
          let filePath = path.join(workDir, target, filename + '_' + (stepCounter) + '.png')
          screenshots.push(filePath)
        }
        screenshots.push(path.join(workDir, 'diff' , filename + '_' + (stepCounter) + '.png'))

        let outputFile = path.join(tempDir, 'temp' , filename + '_' + (stepCounter) + '.png')
        await compileOutput(screenshots, outputFile, filename + '_' + (stepCounter) + '.png')
        pages.push(outputFile)
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
