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
      singleTest.steps = (!!singleTest.steps) ? singleTest.steps : [{ action: 'none' }]
      singleTest.waitfor = (!!singleTest.waitfor) ? singleTest.waitfor : (!!options.waitFor || false) ? options.waitFor : 0
      return singleTest
    },

    createDiffList (tempDir, templatesDir, browsers, data, sequences) {
      let diffTemplate = fs.readFileSync(path.join(templatesDir, 'diff.html'), 'utf8')
      for (let browserName of browsers) {
        for (let sequence of sequences) {
          let targets = funcs.getTargets(sequence)
          let workDir = path.join(tempDir, sequence, browserName)
          let diffList = {
            initials: [],
            steps: []
          }

          let initialActions = funcs.getInitialActions(sequence)
          if (initialActions !== null) {
            let testCounter = 0
            for (let singleTest of initialActions) {
              let test = this.createSingleTest(singleTest)
              let target1url = (test.url ? test.url : targets[options.target1].url)
              let target2url = (test.url ? test.url : targets[options.target2].url)
              let filename = 'initial_' + testCounter.toString().padStart(5, '0')
              testCounter++

              let stepCounter = 0
              for (let step of test.steps) {
                if (step.screenshot !== false) {
                  diffList.initials.push({
                    stepName: filename + '_' + (stepCounter),
                    diffHtml: path.join('Html', sequence, browserName, 'html', filename + '_' + (stepCounter) + '.html'),
                    diffImage: path.join('Html', sequence, browserName, 'diff', filename + '_' + (stepCounter) + '.png')
                  })
                  let diffHTML = Mustache.render(diffTemplate, {
                    target1url: target1url + test.path,
                    target2url: target2url + test.path,
                    target1: options.target1,
                    target2: options.target2,
                    image1: path.join('Html', sequence, browserName, options.target1, filename + '_' + (stepCounter) + '.png'),
                    image2: path.join('Html', sequence, browserName, options.target2, filename + '_' + (stepCounter) + '.png'),
                    data: data
                  })
                  fs.writeFileSync(path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'), diffHTML)
                }
                stepCounter++
              }
            }
          }

          let testCounter = 0
          for (let singleTest of configuration['sequences'][sequence]['list']) {
            let test = this.createSingleTest(singleTest)
            let target1url = (test.url ? test.url : targets[options.target1].url)
            let target2url = (test.url ? test.url : targets[options.target2].url)

            let stepCounter = 0
            let filename = 'test_' + testCounter.toString().padStart(5, '0')
            testCounter++
            for (let step of test.steps) {
              if (step.screenshot !== false) {
                diffList.steps.push({
                  stepName: filename + '_' + (stepCounter),
                  diffHtml: path.join('Html', sequence, browserName, 'html', filename + '_' + (stepCounter) + '.html'),
                  diffImage: path.join('Html', sequence, browserName, 'diff', filename + '_' + (stepCounter) + '.png')
                })
                let diffHTML = Mustache.render(diffTemplate, {
                  target1url: target1url + test.path,
                  target2url: target2url + test.path,
                  target1: options.target1,
                  target2: options.target2,
                  image1: path.join('Html', sequence, browserName, options.target1, filename + '_' + (stepCounter) + '.png'),
                  image2: path.join('Html', sequence, browserName, options.target2, filename + '_' + (stepCounter) + '.png'),
                  data: data
                })
                fs.writeFileSync(path.join(workDir, 'html', filename + '_' + (stepCounter) + '.html'), diffHTML)
              }
              stepCounter++
            }
          }
          let diffListTemplate = fs.readFileSync(path.join(templatesDir, 'diffList.html'), 'utf8')
          let diffListHtml = Mustache.render(diffListTemplate, { diffList: diffList, data: data })
          fs.writeFileSync(path.join(workDir, 'diffList.html'), diffListHtml)
        }
      }
    },

    createDirectoryStructur (vdiffDir) {
      fsExtra.ensureDirSync(path.resolve(configuration.setup.documentRoot, 'Html'))
      fsExtra.ensureDirSync(path.resolve(configuration.setup.documentRoot, 'Resources'))
      fsExtra.ensureDirSync(path.resolve(configuration.setup.documentRoot, 'Resources', 'css'))
      fsExtra.ensureDirSync(path.resolve(configuration.setup.documentRoot, 'Resources', 'js'))
      fs.copyFileSync(
        path.join(vdiffDir, 'resources', 'css', 'all.css'),
        path.resolve(configuration.setup.documentRoot, 'Resources', 'css', 'all.css')
      )
      fs.copyFileSync(
        path.join(vdiffDir, 'resources', 'js', 'comparisons.js'),
        path.resolve(configuration.setup.documentRoot, 'Resources', 'js', 'comparisons.js')
      )

      for (let sequence in configuration['sequences']) {
        for (let browserName in configuration['browser']) {
          let workDir = path.resolve(configuration.setup.documentRoot, 'Html', sequence, browserName)
          fsExtra.ensureDirSync(path.join(workDir, 'diff'))
          fsExtra.ensureDirSync(path.join(workDir, 'html'))

          let targets = funcs.getTargets(sequence)
          for (let key in targets) {
            fsExtra.ensureDirSync(path.join(workDir, key))
          }
        }
      }
    },

    distributeHtmlFiles (templatesDir) {
      let tempDir = path.resolve(configuration.setup.documentRoot, 'Html')
      let domainList = []
      for (let sequence in configuration['sequences']) {
        domainList.push({
          target: 'domain',
          title: sequence,
          href: path.join('Html', sequence, 'index.html')
        })
        let browserList = []
        for (let browserName in configuration['browser']) {
          browserList.push({
            target: 'browser',
            title: browserName,
            href: path.join('Html', sequence, browserName, 'index.html')
          })

          data.index = {
            'target': 'diffList',
            href: path.join('Html', sequence, browserName, 'diffList.html')
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
          'href': path.join('.', 'Html', sequence, 'browserList.html')
        }
        data.target = {
          'target': 'browser',
          'href': ''
        }
        let framesetHTML = Mustache.render(framesetTemplate, { data: data })
        fs.writeFileSync(path.join(tempDir, sequence, 'index.html'), framesetHTML)

        let indexListTemplate = fs.readFileSync(path.join(templatesDir, 'linkIndex.html'), 'utf8')
        let indexListHTML = Mustache.render(indexListTemplate, { linkList: browserList, data: data })

        fs.writeFileSync(path.join(tempDir, sequence, '/browserList.html'), indexListHTML)
      }

      let framesetTemplate = fs.readFileSync(path.join(templatesDir, 'indexFrameset.html'), 'utf8')
      data.index = {
        'target': 'sequences',
        'href': path.join('.', 'Html', 'sequencesList.html')
      }
      data.target = {
        'target': 'domain',
        'href': ''
      }
      let framesetHTML = Mustache.render(framesetTemplate, { data: data })
      fs.writeFileSync(path.join(tempDir, 'index.html'), framesetHTML)

      let indexListTemplate = fs.readFileSync(path.join(templatesDir, 'linkIndex.html'), 'utf8')
      let indexListHTML = Mustache.render(indexListTemplate, { linkList: domainList, data: data })
      fs.writeFileSync(path.join(tempDir, 'sequencesList.html'), indexListHTML)
    }
  }
}
