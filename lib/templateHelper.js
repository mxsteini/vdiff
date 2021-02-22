const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const Mustache = require('mustache')


module.exports = (configuration, options, projectDir, diffToolDir, data) => {
  const funcs = require('./funcs')(options, configuration)
  return {
    createSingleTest (singleTest) {
      if (typeof singleTest == 'string') {
        return {
          steps: [{ action: 'none' }],
          path: singleTest,
          waitfor: (!!options.waitFor || false) ? options.waitFor : 0
        }
      }
      return singleTest
    },

    createDiffList (tempDir, templatesDir, browsers, data, sequences) {
      let diffTemplate = fs.readFileSync(path.join(templatesDir, 'diff.html'), 'utf8')
      for (let browserName of browsers) {
        for (let sequence of sequences) {
          let targets = funcs.getTargets(sequence)
          let target1url = targets[options.target1].url
          let target2url = targets[options.target2].url
          let workDir = path.join(tempDir, sequence, browserName)
          let diffList = {
            initials: [],
            steps: []
          }

          let initialActions = funcs.getInitialActions(sequence)
          if (initialActions !== null) {
            if (initialActions.path) {
              let stepCounter = 0
              let filename = 'initial'
              for (let step of initialActions['steps']) {
                diffList.initials.push({
                  stepName: filename + '_' + (stepCounter),
                  diffHtml: path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'),
                  diffImage: path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png')
                })
                let diffHTML = Mustache.render(diffTemplate, {
                  target1url: target1url + initialActions.path,
                  target2url: target2url + initialActions.path,
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
        let testCounter = 0
          for (let singleTest of configuration['sequences'][sequence]['list']) {
            let test = this.createSingleTest(singleTest)

            let stepCounter = 0
            let filename = 'test_' + testCounter.toString().padStart(5, '0')
            testCounter++
            for (let step of test.steps) {
              diffList.steps.push({
                stepName: filename + '_' + (stepCounter),
                diffHtml: path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'),
                diffImage: path.join(workDir, 'diff', filename + '_' + (stepCounter) + '.png')
              })
              let diffHTML = Mustache.render(diffTemplate, {
                target1url: target1url + test.path,
                target2url: target2url + test.path,
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
    },

    createDirectoryStructur (tempDir) {
      for (let sequence in configuration['sequences']) {
        for (let browserName in configuration['browser']) {
          let workDir = path.join(tempDir, sequence, browserName)
          fsExtra.ensureDirSync(path.join(workDir, 'diff'))
          fsExtra.ensureDirSync(path.join(workDir, 'html'))

          let targets = funcs.getTargets(sequence)
          for (let key in targets) {
            fsExtra.ensureDirSync(path.join(workDir, key))
          }
        }
      }
    },

    distributeHtmlFiles (tempDir, templatesDir) {
      let domainList = []
      for (let sequence in configuration['sequences']) {
        domainList.push({
          target: 'domain',
          title: sequence,
          href: './' + sequence + '/index.html'
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
          fs.writeFileSync(path.join(tempDir, sequence, browserName, '/index.html'), framesetHTML)
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
        fs.writeFileSync(path.join(tempDir, sequence, 'index.html'), framesetHTML)

        let indexListTemplate = fs.readFileSync(path.join(templatesDir, 'linkIndex.html'), 'utf8')
        let indexListHTML = Mustache.render(indexListTemplate, { linkList: browserList, data: data })
        fs.writeFileSync(path.join(projectDir, 'tmp', sequence, '/browserList.html'), indexListHTML)
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
  }
}
