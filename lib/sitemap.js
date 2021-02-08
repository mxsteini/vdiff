const SitemapXMLParser = require('sitemap-xml-parser')
const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')
const YAML = require('yaml')


module.exports = (configuration, options, projectDir) => {
  testsDir = path.join(projectDir, 'tests')
  fsExtra.ensureDirSync(testsDir)

  return {
    fetch (url, depth, testName) {
      const options = {
        delay: 3000,
        limit: 5
      }

      const sitemapXMLParser = new SitemapXMLParser(url, options)

      sitemapXMLParser.fetch().then(result => {
        let locations = []
        for (let location of result) {
          let url = new URL(location.loc[0])
          let pathArray = url.pathname.split('/')
          if (pathArray.length <= depth ) {
            locations.push(url.pathname)
          }
        }
        let yaml = {
          [testName]: {
            'list': [...new Set(locations)]
          }
        }
        let output = YAML.stringify(yaml)
        fs.writeFileSync(path.join(testsDir, testName + '.yaml'), output)
      })
    }
  }
}