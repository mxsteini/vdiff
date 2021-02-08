const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const Mustache = require('mustache')


const createSingleTest = (singleTest, options) => {
  if (typeof singleTest == 'string') {
    return {
      steps: [{ action: 'none' }],
      path: singleTest,
      waitfor: options.waitfor ? options.waitfor : 0
    }
  }
  return singleTest
}


const createDiffList = (configuration, tempDir, templatesDir, browsers, data, domains, options) => {
  let diffTemplate = fs.readFileSync(path.join(templatesDir, 'diff.html'), 'utf8')
  for (let browserName of browsers) {
    for (let domain of domains) {
      let target1url = configuration['targets'][domain]['target'][options.target1]
      let target2url = configuration['targets'][domain]['target'][options.target2]
      let workDir = path.join(tempDir, domain, browserName)
      let diffList = {
        initials: [],
        steps: []
      }
      if (!!configuration['targets'][domain]['initialActions']) {
        if (configuration['targets'][domain]['initialActions'].path) {
          let singleTest = configuration['targets'][domain]['initialActions']
          let stepCounter = 0
          let filename = 'initial'
          for (let step of configuration['targets'][domain]['initialActions']['steps']) {
            diffList.initials.push({
              stepName: filename + '_' + (stepCounter),
              diffHtml: path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'),
              diffImage: path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png')
            })
            let diffHTML = Mustache.render(diffTemplate, {
              target1url: target1url + singleTest.path,
              target2url: target2url + (singleTest.path2 ? singleTest.path2 : singleTest.path),
              target1: options.target1,
              target2: options.target2,
              image1: path.join(workDir, options.target1, filename + '_' + (stepCounter) + '.png'),
              image2: path.join(workDir, options.target2, filename + '_' + (stepCounter) + '.png'),
              data: data
            })
            fs.writeFileSync(path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'), diffHTML)
            stepCounter++
          }
        }
      }
      for (let singleTest of configuration['targets'][domain]['list']) {
        let test = createSingleTest(singleTest, options)

        let filename = test.path.replace(/ /g, '_').replace(/\//g, '_')
        let stepCounter = 0
        for (let step of test.steps) {
          diffList.steps.push({
            stepName: filename + '_' + (stepCounter),
            diffHtml: path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'),
            diffImage: path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png')
          })
          let diffHTML = Mustache.render(diffTemplate, {
            target1url: target1url + test.path,
            target2url: target2url + (test.path2 ? test.path2 : test.path),
            target1: options.target1,
            target2: options.target2,
            image1: path.join(workDir, options.target1, filename + '_' + (stepCounter) + '.png'),
            image2: path.join(workDir, options.target2, filename + '_' + (stepCounter) + '.png'),
            data: data
          })
          fs.writeFileSync(path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'), diffHTML)
          stepCounter++
        }
      }
      let diffListTemplate = fs.readFileSync(path.join(templatesDir, 'diffList.html'), 'utf8')
      let diffListHtml = Mustache.render(diffListTemplate, { diffList: diffList, data: data })
      fs.writeFileSync(path.join(workDir, 'diffList.html'), diffListHtml)
    }
  }
}

const createDirectoryStructur = (configuration, tempDir) => {
  for (let domain in configuration['targets']) {
    for (let browserName in configuration['browser']) {
      let workDir = path.join(tempDir, domain, browserName)
      fsExtra.ensureDirSync(path.join(workDir, 'diff'))
      fsExtra.ensureDirSync(path.join(workDir, 'html'))
      for (let key in configuration['targets'][domain].target) {
        fsExtra.ensureDirSync(path.join(workDir, key))
      }
    }
  }
}

const distributeHtmlFiles = (configuration, tempDir, templatesDir, projectDir, data) => {
  let domainList = []
  for (let domain in configuration['targets']) {
    domainList.push({
      target: 'domain',
      title: domain,
      href: './' + domain + '/index.html'
    })
    let browserList = []
    for (let browserName in configuration['browser']) {
      browserList.push({
        target: 'browser',
        title: browserName,
        href: './' + browserName + '/index.html'
      })

      data.index = {
        'target': 'diffList',
        'href': './diffList.html'
      }
      data.target = {
        'target': 'diff',
        'href': ''
      }
      let framesetTemplate = fs.readFileSync(path.join(templatesDir, 'diffFrameset.html'), 'utf8')
      let framesetHTML = Mustache.render(framesetTemplate, { data: data })
      fs.writeFileSync(path.join(tempDir, domain, browserName, '/index.html'), framesetHTML)
    }
    let framesetTemplate = fs.readFileSync(path.join(templatesDir, 'indexFrameset.html'), 'utf8')
    data.index = {
      'target': 'browserList',
      'href': './browserList.html'
    }
    data.target = {
      'target': 'browser',
      'href': ''
    }
    let framesetHTML = Mustache.render(framesetTemplate, { data: data })
    fs.writeFileSync(path.join(tempDir, domain, 'index.html'), framesetHTML)

    let indexListTemplate = fs.readFileSync(path.join(templatesDir, 'linkIndex.html'), 'utf8')
    let indexListHTML = Mustache.render(indexListTemplate, { linkList: browserList, data: data })
    fs.writeFileSync(path.join(projectDir, 'tmp', domain, '/browserList.html'), indexListHTML)
  }

  let framesetTemplate = fs.readFileSync(path.join(templatesDir, 'indexFrameset.html'), 'utf8')
  data.index = {
    'target': 'domainList',
    'href': './domainList.html'
  }
  data.target = {
    'target': 'domain',
    'href': ''
  }
  let framesetHTML = Mustache.render(framesetTemplate, { data: data })
  fs.writeFileSync(path.join(tempDir, 'index.html'), framesetHTML)

  let indexListTemplate = fs.readFileSync(path.join(templatesDir, 'linkIndex.html'), 'utf8')
  let indexListHTML = Mustache.render(indexListTemplate, { linkList: domainList, data: data })
  fs.writeFileSync(path.join(tempDir, 'domainList.html'), indexListHTML)
}


module.exports = {
  createSingleTest,
  createDirectoryStructur,
  distributeHtmlFiles,
  createDiffList
}
