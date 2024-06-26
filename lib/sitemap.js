const SitemapXMLParser = require('sitemapper')
const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')
const YAML = require('yaml')


module.exports = (configuration, options, projectDir) => {
  sequencesDir = path.join(projectDir, 'sequences')
  fsExtra.ensureDirSync(sequencesDir)

  return {
    fetch (url, depth, testName) {
      const options = {
        url: url,
        timeout: 15000,
        limit: 5
      }

      const sitemapXMLParser = new SitemapXMLParser(options)

      sitemapXMLParser.fetch().then(({ url, sites }) => {
        console.log(url)
        console.log(sites)
        let locations = []
        for (let location of sites) {
          let url = new URL(location)
          console.log(url)
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
        fs.writeFileSync(path.join(sequencesDir, testName + '.yaml'), output)
      })
    }
  }
}
