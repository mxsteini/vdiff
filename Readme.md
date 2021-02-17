# install
```bash
npm i -P git+ssh://git@gitlab.cyperfection.de:mst/frontendtest.git
```


## usage
./node_modules/diff-tool/bin/difftool.js [parameter]

- --target1 targetname: name of target1 
- --target2 targetname: name of target2 
- --skipTarget number: skip screenshooting target possible values 1 and 2 use this to prevent exclusions by admins
- --conc int: number of parallel browser should be started (default: 5)
- --sequence sequencename: name of sequence to run
- --mode [screenshots|crawl|sitemap|crawl]

  - screenshots [default]
  
  - pdf: create a pdf 
  
  - crawl run a crawler
    
    requires --url url
    
    optional --depth number

  - sitemap getch sitemap from url
    
    requires --url url
    
    optional --depth number

## example without params 
look at tasks/ui-test.js for defaults
```bash 
gulp ui-tests 
```

## example with params
```bash 
./runtest.js --domain luin --target1 dev --target2 build
```

## check results
open tmp/[domain]/frameset.html in chrome

## normal run
```bash
gulp ui-tests --skipTarget 1
```
