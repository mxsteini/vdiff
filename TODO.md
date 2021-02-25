# Features

* [ ] separate default setup and put it resources/setup.json

* [ ] local resources for having private templates

* [ ] better template for pdf
    
    * remove imagecompilation
    
    * add images in div with flex, rotate them by CSS

* [ ] extend screenshot capability like this
  ```yaml
  steps:
    -
      action: 
      waitFor: 500
      screenshot: false
    -
      action: click
      action_selector: button
      waitFor: 100
      screenshot: 
        -
          element_selector: "#navigation"
    -
      action: click
      action_selector: button
      waitFor: 100
      screenshot:
        -
        x: 100
        y: 100
        w: 100
        h: 100
  ```
  
* [ ] collect sequence results in an array together with metrics, console.log, etc. an render that stuff to the html