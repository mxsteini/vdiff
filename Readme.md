# install
```bash
podman run -it --rm --init --security-opt label=disable --volume .:/var/mnt:z -w /var/mnt node:12 npm i
```


## usage
./runtests.js [parameter]

- --target1 targetname: name of target1 
- --target2 targetname: name of target2 
- --conc int: number of parallel browser should be started (default: 5)
- --domain domainname: name of domain to test
- --single testname: run a single named test
- --class classname: run tests with a named class
- --skipTarget number: skip screenshooting target possible values 1 and 2 use this to prevent exclusions by admins


```json
{
    "google": { // this is the domain
        "target": {
            "live": "https://www.google.com",
            "dev": "https://dev.google.com"
        },
        "tests": [
            {
                "comment": "Home",
                "class": [
                    "home",
                    "fast"
                ],
                "path": "/",
                "methods": [
                    {
                        "name": "defaultTest"
                    }
                ]
            }
       ]
   }
}
```

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
