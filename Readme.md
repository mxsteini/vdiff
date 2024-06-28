# NAME

**vdiff** visual difference of two webpages with the capability to run acceptance tests

# SYNOPSIS

**vdiff** [**--mode** screenshosts] [**--target1** string] [**--target2** string] [**--browser** string] [**--sequence** string|csv] [**--conc** number] [**--skipTarget** 1|2]

**vdiff** **--mode** pdf

**vdiff** **--mode** crawl **--url** url [**--depth** depth] [**--sequenceName** name_of_sequence]

**vdiff** **--mode** sitemap **--url** url [**--depth** depth] [**--sequenceName** name_of_sequence]

# DESCRIPTION

vdiff is a tool to show the difference of to webpages in a visual way. It gives you an simple interface which contains a thumbnail with an overview and a detailview. \
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

* sequence: \
A list of path or object with path and step which are performed on the url of the given target. \
  Sequences could be stored as json or yaml in the sequences folder

* step: \
An array that contains an action, action data and waitFor
  * action: hover, click, focus, type, press
  * action_selector: is a html selector and need by hover, click, focus
  * action_input: is a string or key and needed by type, press
  * waitfor: the time to wait before taking the screenshot

# Installation
```bash
# using https
npm i mst-vdiff
```
# Quick start

For review have a look to this demo <http://www.michaelstein-itb.de/vdiff/Html/index.html>
(sorry for the missing certificate)

If you want to install this tool local, use the following
## render html
```bash
cp ./node_modules/vdiff/resources/misc/configuration.demo.json configuration.json
npx vdiff
google-chrome vdiff/Html/index.html
```

## render pdf
```bash
npx vdiff --mode pdf
```

# Usage
```bash
npx vdiff [options]
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

**--browser** [string | \_all_]

Run a sequence an a single browser which is defined in the browser setion in configuration.json. \_all_ runs the sequence with all defined browsers.

**--sequence** [string(csv) | \_all_]

Run this sequence. \_all_ runs all sequences
You could give a list of sequence separeted by , without! spaces

**--url**

In --mode crawl this url is used as baseurl. In --mode sitemap the url must result in sitemap.xml file.

**--sequenceName**

The file an sequence name where to write the result of --mode crawl or --mode sitemap. Default is sitemap.

**--depth**

The depth for --mode crawl and --mode sitemap. Default is 3.

**--conc**

This value is very critical. It describes the number of pages which are opened simultaneous. **Beware** if you run a sequence against a production system, it will result in a DoS defense. Use the --skipTarget save the production system.

## FILES

*configuration.json*\
Contains the basic configuration.

*sequences/\*.json*
Contains sequences

*sequences/\*.yaml*
Contains sequences

## .env
NODE_CONFIGURATION
NODE_SKIP_TARGET
NODE_CONC
NODE_MODE
NODE_BROWSER
NODE_SEQUENCE
NODE_TARGET1
NODE_TARGET2
NODE_DEBUG
NODE_DEPTH
NODE_SEQUENCE_NAME
NODE_OUTPUT
NODE_URL
NODE_EXECUTABLE_PATH
NODE_MAX_LISTENERS

# Test
```bash
npx vdiff
npx vdiff --mode pdf
npx vdiff --mode crawl --url https://www.monobloc.de --depth 1 --sequenceName mono_crawl
npx vdiff --mode sitemap --url https://www.monobloc.de/sitemap.xml --depth 3 --sequenceName mono_sitemap

```
## DIRECTORIES

* sequences \
put the configuration of all your sequnces in here

* tmp \
here you will find the result of your sequences


## CREDITS

As like many other project this project depends on the work of other people.

But one of them is special and has to be mentioned in this context. He is my friend and together with him, this tool has its today shape.

* Luca Kredel <https://github.com/Phosphenius>


## BUGS

See GitHub Issues: <https://github.com/mxsteini/vdiff/issues>

## AUTHOR

Michael Stein <info@michaelstein-itb.de>

