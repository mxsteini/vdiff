# NAME

**vdiff**

# SYNOPSIS

**vdiff** [**--mode** screenshosts] [**--target1** string] [**--target2** string] [**--browser** string] [**--sequence** string] [**--conc** number] [**--skipTarget** 1|2]

**vdiff** **--mode** pdf

**vdiff** **--mode** crawl **--url** url [**--depth** depth] [**--sequenceName** name_of_sequence]

**vdiff** **--mode** sitemap **--url** url [**--depth** depth] [**--sequenceName** name_of_sequence]

# DESCRIPTION

vdiff is a tool to show the difference of to webpages. It gives you an simple interface which contains a thumbnail with an overview and a detailview. \
It uses puppeteer and the build in chromium browser to generate the screenshosts. \
In the "normal" screenshot mode you don't need any configuration if they are configured correctly in configuration.json. This enables your non-geek-QA-collegue to run predefined test without having detailed CLI knowledge.\
**Attention** this tool opens many browsers (see the --conc option) and sends many request to the given target. This may result in some DoS fend offs. To prevent this use the --skipTarget option.

## How it works

If you start vdiff in screenshots mode, it will open one or two browsers per sequence. Each browser will perform the initialAction and then the sequence.

# DICTIONARY

* target: \
Name for a baseurl to test. Usual names are: dev, build, live, stage.
  
* browser: \
The name of the browser configuraion which is required. You can have as much browser configuration as you want. Have a look at resources/misc/configuration.dist.json in the section browser.

* initialAction: \
Contains a path and steps section. These steps are executed before a sequence is started

* sequense: \
A list of path or object with path and step which are performed on the url of the given target. \
  Sequences could be stored as json or yaml in the sequences folder


# Installation
```bash
# init your project
npm init

# using https
npm i -P git+https://github.com/mxsteini/vdiff.git

# using ssh
npm i -P git+ssh://git@github.com/mxsteini/vdiff.git
```

# Usage
```bash
./node_modules/diff-tool/bin/vdiff.js [options]
```

## Configuration
As a good starting point get a copy of configuration.json from resources/misc/configuration.json.
After configuring configuration.json for your needs, get a copy test.yaml and put it in sequences.

## Options

--mode [sreenshosts|pdf|crawl|sitemap]

**screenshosts**: is the default mode. No other option is need but can be given: --target1, --target2, --skipTarget, --browser, --sequence

**pdf**: No other option is need but can be given: --browser, --sequence

**crawl**: crawl an url to create a sequence. Requires option is --url. Optional parameters are --sequenceName, --depth

**sitemap**: fetch the given url, extract the paths and write in down in the given (--sequenceName) file. Requires option is --url. Optional parameters are --sequenceName, --depth \

**--target1** string

This is the name of first target to inspect. This has to be defined in configuration.json in the section default.target or in each sequence in the section target 

**--target2** string

This is the name of second target to inspect. This has to be defined in configuration.json in the section default.target or in each sequence in the section target

**--skipTarget** [1|2]

This option defines which target should be skipped in sequence. This is to prevent a Denial of Service attac action against you. 

**--browser** string

Run a sequence an a single browser which is defined in the browser setion in configuration.json 

**--sequence** string

Run this sequence.

--url

In --mode crawl this url is used as baseurl. In --mode sitemap the url must result in sitemap.xml file.

--sequenceName

The file an sequence name where to write the result of --mode crawl or --mode sitemap. Default is sitemap.

--depth

The depth for --mode crawl and --mode sitemap. Default is 3.

--conc

This value is very critical. It describes the number of pages which are opened simultaneous. **Beware** if you run a sequence against a production system, it will result in a DoS defense. Use the --skipTarget save the production system.

## FILES

*configuration.json*\
Contains the basic configuration. 

*sequences/\*.json*
Contains sequences

*sequences/\*.yaml*
Contains sequences

## DIRECTORIES

* sequences \
put the configuration of all your sequnces in here
  
* tmp \
here you will find the result of your sequences

## ENVIRONMENT

**DEFAULT_HELLO_DEDICATION**

:   The default dedication if none is given. Has the highest precedence
if a dedication is not supplied on the command line.

## CREDITS

puppeteer
jimp
cyperfection

## BUGS

See GitHub Issues: <https://github.com/[owner]/[repo]/issues>

## AUTHOR

Michael Stein <info@michaelstein-itb.de>

