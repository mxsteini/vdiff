# install
```bash
npm i -P git+ssh://git@gitlab.cyperfection.de:mst/frontendtest.git
```


## usage
./node_modules/diff-tool/bin/difftool.js [parameter]

- --target1 targetname: name of target1 
- --target2 targetname: name of target2 
- --conc int: number of parallel browser should be started (default: 5)
- --domain domainname: name of domain to test
- --single testname: run a single named test
- --class classname: run tests with a named class
- --skipTarget number: skip screenshooting target possible values 1 and 2 use this to prevent exclusions by admins
- --mode
  -- screenshots [default]
  -- crawl run a crawler

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
