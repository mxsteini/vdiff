# install
% VDIFF(1) Version 1.0 | vdiff is a package for visualize the difference of 2 webpages

NAME
====

**vdiff**

SYNOPSIS
========

**vdiff** [**--mode** screenshosts] [**--target1** string] [**--target2** string] [**--browser** string] [**--sequence** string] [**--conc** number] [**--skipTarget** 1|2]

**vdiff** [**--mode** pdf] [_dedication_]

**vdiff** **--mode** crawl **--url** url [**--depth** depth] [**--sequenceName** name_of_sequence]

**vdiff** **--mode** sitemap **--url** url [**--depth** depth] [**--sequenceName** name_of_sequence]

DESCRIPTION
===========
vdiff is a tool to show the difference of to webpages. It gives you an simple interface which contains a thumbnail with an overview and a detailview.

It uses puppeteer and the build in chromium browser to generate the screenshosts.

In the "normal" screenshot mode you don't need any configuration if they are configured correctly in configuration.json. This enables your non-geek-QA-collegue to run predefined test without having detailed CLI knowledge.

Installation
------------

```bash
npm i -P git+ssh://git@gitlab.cyperfection.de:mst/frontendtest.git
```

Options
-------

--mode [sreenshosts|pdf|crawl|sitemap]

**screenshosts** is the default mode. No other option is need but can be given: --target1, --target2, --skipTarget, --browser, --sequence,

**pdf** No other option is need but can be given: --browser, --sequence,

**crawl** crawl an url to create a sequence. Requires option is --url. Optional parameters are --sequenceName, --depth



--target1

--target2

--skipTarget

--browser

--sequence

--url

--sequenceName

--depth

--conc

-h, --help

:   Prints brief usage information.

-o, --output

:   Outputs the greeting to the given filename.

    The file must be an **open(2)**able and **write(2)**able file.

-v, --version

:   Prints the current version number.

FILES
=====

*configuration.json*

*sequences/\*.json*

*sequences/\*.yaml*


ENVIRONMENT
===========

**DEFAULT_HELLO_DEDICATION**

:   The default dedication if none is given. Has the highest precedence
if a dedication is not supplied on the command line.

CREDITS
=======

puppeteer
jimp
cyperfection

BUGS
====

See GitHub Issues: <https://github.com/[owner]/[repo]/issues>

AUTHOR
======

Michael Stein <info@michaelstein-itb.de>

SEE ALSO
========

**hi(1)**, **hello(3)**, **hello.conf(5)**





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
