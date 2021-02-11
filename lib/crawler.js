var Crawler = require('simplecrawler')

const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')
const YAML = require('yaml')
const better = require('./logger')


module.exports = (configuration, options, projectDir) => {
  testsDir = path.join(projectDir, 'tests')
  fsExtra.ensureDirSync(testsDir)

  return {
    fetch (url, depth, testName, conc) {
      var crawler = new Crawler(url)
      crawler.interval = 5000 // Ten seconds
      crawler.maxConcurrency = conc
      crawler.maxDepth = depth
      crawler.allowInitialDomainChange = false
      crawler.addFetchCondition((queueItem) => {
        return (queueItem.uriPath.match(/.*\.[js|css|jpg|ico|xml|pdf|]/) === null)
      })
      crawler.start()

      return new Promise((resolve, reject) => {
          let locations = []
          crawler.on('fetchcomplete', function (queueItem, responseBuffer, response) {
            locations.push(queueItem.uriPath)
            console.log('I just received %s (%d bytes)', queueItem.url, responseBuffer.length)
          })
          crawler.on('complete', function () {
            let yaml = {
              [testName]: {
                'list': [...new Set(locations)]
              }
            }
            let output = YAML.stringify(yaml)
            fs.writeFileSync(path.join(testsDir, testName + '.yaml'), output)
            resolve()
          })
        }
      )
    }
  }
}