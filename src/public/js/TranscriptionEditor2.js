/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/*eslint-env es6*/
/*eslint-env jquery*/

/*eslint no-var: "error"*/
/*eslint default-case: "error"*/
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

/* global Twig, Quill, _, EditorData, NoWordBreakBlot */

/**
 * 
 * Implementation of the transcription editor
 */
class TranscriptionEditor
{
  
  /**
   * Constructs the transcription editor in the DOM node with the 
   * given HTML id (containerId) with the given id number and the given
   * options.
   * 
   * The id number is used as a suffix to all HTML ids for the page
   * elements of the particular TranscriptionEditor instance.
   * 
   * 
   * @param {string} containerId
   * @param {int} id
   * @param {object} userOptions
   * @returns {Boolean}
   */
  constructor(containerId, id = 1, userOptions = false)
  {
    this.containerId = containerId
    this.id = id
    this.options = TranscriptionEditor.getOptions(userOptions)
    this.people = this.options.people
    this.editorId = this.options.editorId
    // Default hand Id is always 0!
    this.handId = 0
    
    this.minItemId = 0
    this.minNoteId = 0
    
    let containerSelector = '#' + containerId
    const editorHtml = TranscriptionEditor.editorTemplate.render({id: id})
    $(containerSelector).html(editorHtml)
    const modalsHtml = TranscriptionEditor.modalsTemplate.render({id: id})
    $('body').append(modalsHtml)
    
    this.quillObject = new Quill('#editor-container-' + this.id, {})
    this.setDefaultLang(this.options.defaultLang)
    this.setFontSize(this.options.langDef[this.defaultLang].fontsize)
    this.setData(null) // start with empty data
   
    // EVENT HANDLERS
    $(window).on('resize', this.genOnResize())
    // Disable drag and drop in editor (too many issues)
    $(containerSelector).on('dragstart drag dragend drop', function ()
    {
      return false
    })
    this.quillObject.on('text-change', this.genOnQuillChange());
    this.quillObject.on('selection-change', this.genOnSelectionChange())
    
    // TOP TOOLBAR
    $('#zoom-in-button-' + id).on('click', this.genOnClickZoomButton('in'))
    $('#zoom-out-button-' + id).on('click', this.genOnClickZoomButton('out'))
    $('#toggle-button-'+ id).on('click', this.genOnClickToggleEnableButton())
    $('#save-button-' + id).on('click', this.genOnClickSaveButton())
    $('#reset-button-' + id).on('click', this.genOnClickResetButton())
    
    // BOTTOM TOOLBAR
    
    // Clear and edit
    $('#clear-button-' + id).on('click', this.genOnClickClearFormats())
    $('#edit-button-'+id).on('click', this.genOnClickEdit())
    
    // Language Buttons and default language options
    let langDef = this.options.langDef
    for (const lang in this.options.langDef) {
      // language button
      let buttonId = lang + '-button-' + this.id
      $('#langButtons-'+this.id).append(
              '<button id="' + buttonId +  '" class="langButton" ' + 
              'title="' + langDef[lang].name + '" disabled>' + 
              lang + '</button>'
        ) 
      $('#' + buttonId).on('click', this.genOnClickLangButton(lang))
      // option in default language menu
      let optionId = 'set-' + lang + '-' + this.id 
      $('#set-lang-dd-menu-' + id).append('<li><a id="'+ optionId +'">' 
              + langDef[lang].name + '</a></li>')
      $('#' + optionId).on('click', this.genOnClickSetLang(lang))
    }
   
    // Simple formats
    for (const formatBlot of TranscriptionEditor.formatBlots) {
      // No button
      if (formatBlot.noButton) {
        continue
      }
      let buttonId = formatBlot.name + '-button-' + this.id
      if (formatBlot.buttonWithOptions) {
        if (formatBlot[formatBlot.buttonWithOptions] === undefined) {
          console.error('Undefined options field for blot ' + formatBlot.name)
          continue
        }
        let optionsFieldName = formatBlot.buttonWithOptions
        let optionsField = formatBlot[optionsFieldName]
        let dropdownHtml = ''
        dropdownHtml += '<span class="dropdown">'
        dropdownHtml +=
            '<button id="' + buttonId +  '" ' + 
            'class="selFmtBtn" ' +
            'title="' + formatBlot.title + '"' + 
            'disabled data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"' +
            '>' + 
            formatBlot.icon + '</button>'
        dropdownHtml += '<ul class="dropdown-menu" aria-labelledby="'  +
          buttonId + '">'
        dropdownHtml += '<li><a>' +optionsField.title + '</a></li>'
        dropdownHtml += '<li role=separator class=divider>'
        let optionNumber = 1
        for (const option of optionsField.options ) {
          let optionId = buttonId + '-' + optionNumber
          dropdownHtml += '<li><a id="' + optionId + '">' + option + '</a></li>'
          optionNumber++
        }
        dropdownHtml += '</ul></span'
        $('#simpleFormatButtons-'+this.id).append(dropdownHtml)
        optionNumber = 1
        for (const option of optionsField.options ) {
          let value = {}
          value[optionsFieldName] = option
          $('#'+buttonId + '-' + optionNumber).on('click', 
            this.genOnClickSimpleFormat(formatBlot, value))
          optionNumber++
        }
        continue
      }
      
      // Single button
      $('#simpleFormatButtons-'+this.id).append(
              '<button id="' + buttonId +  '" ' + 
              'class="selFmtBtn" ' +
              'title="' + formatBlot.title + '">' + 
              formatBlot.icon + '</button>'
        )
      $('#'+buttonId).on('click', this.genOnClickSimpleFormat(formatBlot))
      $(containerSelector).on('dblclick','.' + formatBlot.className, 
          this.genOnDoubleClickSimpleFormat())
    }
    
    // Image formats
    for (const theBlot of TranscriptionEditor.imageBlots) {
      // No button
      if (theBlot.noButton) {
        if (theBlot.withEditOnDoubleClick) {
          $(containerSelector).on('dblclick','.' + theBlot.className, 
            this.genOnDoubleClickSimpleEmbed(theBlot))
        }
        continue
      }
      // Single button
      if (theBlot.buttons === undefined) {
        // with options 
        if (theBlot.buttonWithOptions) {
          // do later!
        } else {
          let buttonId = theBlot.name + '-button-' + this.id
          $('#simpleImageButtons-'+this.id).append(
                '<button id="' + buttonId +  '" ' + 
                'class="imgFmtBtn" ' +
                'title="' + theBlot.title + '">' + 
                theBlot.icon + '</button>'
            )
          $('#'+buttonId).on('click', this.genOnClickSimpleImageButton(theBlot))
          if (theBlot.withEditOnDoubleClick) {
            $(containerSelector).on('dblclick','.' + theBlot.className, 
              this.genOnDoubleClickSimpleEmbed(theBlot))
          }
          continue
        }
      }
      // Multiple buttons
      for (const theButton of theBlot.buttons) {
        let buttonId = theBlot.name + theButton.name + '-button-' + this.id
        $('#simpleImageButtons-'+this.id).append(
                '<button id="' + buttonId +  '" ' + 
                'class="imgFmtBtn" ' +
                'title="' + theButton.title + '">' + 
                theButton.icon + '</button>'
          )
        $('#'+buttonId).on('click', this.genOnClickSimpleImageButton(theBlot, theButton.value))
        //$(containerSelector).on('dblclick','.' + formatBlot.className, 
        //    this.genOnDoubleClickSimpleImage(theBlot))
      }
    }
    
    // Special image buttons
    $('#chunk-start-button-' + id).click(
            this.genChunkButtonFunction('start'))
    $('#chunk-end-button-' + id).click(
            this.genChunkButtonFunction('end'))
    
    // Special Characters
    for (const char of TranscriptionEditor.specialCharacters) {
      let buttonId = char.name + '-button-' + this.id
      $('#specialCharacterButtons-'+this.id).append(
              '<button id="' + buttonId +  '" ' + 
              //'class="selFmtBtn" ' +
              'title="' + char.title + '">' + 
              char.icon + '</button>'
        )
      $('#'+buttonId).on('click', this.genOnClickSpecialCharacterButton(char))
      //$(containerSelector).on('dblclick','.' + formatBlot.className, 
      //    this.genOnDoubleClickSimpleImage(theBlot))
    }
    
    // Note button
    $('#note-button-' + id).on('click', this.genOnClickNoteButton())

    // Block formats
    $('#line-button-' + id).on('click', this.genOnClickLineButton())
    
    for (const blockBot of TranscriptionEditor.blockBlots) {
      // No button
      if (blockBot.noButton) {
        continue
      }
      // Single button
      if (blockBot.buttons === undefined) {
        let buttonId = blockBot.name + '-button-' + this.id
        // with options 
        if (blockBot.buttonWithOptions) {
          if (blockBot[blockBot.buttonWithOptions] === undefined) {
            console.error('Undefined options field for blot ' + blockBot.name)
            continue
          }
          let optionsFieldName = blockBot.buttonWithOptions
          let optionsField = blockBot[optionsFieldName]
          let dropdownHtml = ''
          dropdownHtml += '<span class="dropdown">'
          dropdownHtml +=
              '<button id="' + buttonId +  '" ' + 
              'title="' + blockBot.title + '"' + 
              'data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"' +
              '>' + 
              blockBot.icon + '</button>'
          dropdownHtml += '<ul class="dropdown-menu" aria-labelledby="'  +
            buttonId + '">'
          dropdownHtml += '<li><a>' +optionsField.title + '</a></li>'
          dropdownHtml += '<li role=separator class=divider>'
          let optionNumber = 1
          for (const option of optionsField.options ) {
            let optionId = buttonId + '-' + optionNumber
            dropdownHtml += '<li><a id="' + optionId + '">' + option + '</a></li>'
            optionNumber++
          }
          dropdownHtml += '</ul></span'
          $('#simpleBlockButtons-'+this.id).append(dropdownHtml)
          optionNumber = 1
          for (const option of optionsField.options ) {
            let value = {}
            value[optionsFieldName] = option
            $('#'+buttonId + '-' + optionNumber).on('click', 
              this.genOnClickSimpleBlockButton(blockBot, value))
            optionNumber++
          }
          continue
        } else {
          $('#simpleBlockButtons-'+this.id).append(
                  '<button id="' + buttonId +  '" ' + 
                  'title="' + blockBot.title + '">' + 
                  blockBot.icon + '</button>'
            )
          $('#'+buttonId).on('click', this.genOnClickSimpleBlockButton(blockBot))
          continue
        }
      }
    }
    
    // Special image blocks
    
    $('#linegap-button-' + id).on('click', this.genOnClickLineGapButton())

    // enable/disable
    if (this.options.startEnabled) {
      this.enable()
    }
    else {
      this.disable()
    }
    // generate number lines when all elements are done
    this.numberLines()
    
    TranscriptionEditor.registerEditorInstance(this.id, this)
  }

  /**
   * Generates a full options object from a user options object
   * It fills the options objects with appropriate defaults for 
   * parameters not specified by the user.
   * 
   * @param {object} userOptions
   * @returns {TranscriptionEditor.getOptions.options}
   */
  static getOptions(userOptions) {
    let options = userOptions
    if (options === false) {
      options = {}
    }
    
    if (options.people === undefined) {
      options.people = []
      options.people[0] = { fullname: 'No editor' }
      options.people[1] = { fullname: 'Editor 1'}
    }
    // editorId: int
    // the Id of the transcriber
    if (options.editorId === undefined) {
      options.editorId = 1 // 
    }
    
    // startEnabled:  true/false
    if (options.startEnabled === undefined) {
      options.startEnabled = false
    }

    // langDef : language definitions
    if (options.langDef === undefined) {
      options.langDef = { 
        ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 5},  // Scheherazade font
        jrb: { code: 'jrb', name: 'Judeo Arabic', rtl: true, fontsize: 3}, // SIL Ezra 
        he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3},  // Linux Libertine font
        la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3}  // Arial 
      }    
    }
    
    // defaultLang :  language code
    if (options.defaultLang === undefined) {
      options.defaultLang = 'la'
    }
    
    
    if (options.hands === undefined) {
      options.hands = [ 
        { name: '1', id: 0 }, 
        { name: '2' , id: 1 },
        { name: '3' , id: 2 }
      ]
    }
    // Min and max font size : integer
    if (options.minFontSize === undefined) {
      options.minFontSize = 0
    }
    if (options.maxFontSize === undefined) {
      options.maxFontSize = 10
    }
    // Line number options
    if (options.lineNumbers === undefined) {
      options.lineNumbers   = {
        fontFactor: 0.6,
        charWidth: 0.6, // for PT Mono
        margin: 5,
        numChars: 2
      }
    }
    // pixPerEm : Integer
    // Pixels per Em (normally 16)
    if (options.pixPerEm === undefined) {
      options.pixPerEm = 16
    }
    // editorLineHeight: Number
    // lineHeight in ems for normal paragraphs in the
    // editor (must match what's given in the CSS definition)
    if (options.editorLineHeight === undefined) {
      options.editorLineHeight = 1.4
    }
    return options
  }
    
  setDefaultLang(lang)
  {
    let langDef = this.options.langDef
    if (langDef[lang] === undefined) {
      console.log('Invalid default language: ' + lang)
      return false
    }

    for (const l in langDef) {
      if (l === lang) {
        $('#editor-container-' + this.id).addClass(l + '-text')
        continue
      }
      $('#editor-container-' + this.id).removeClass(l + '-text')
    }

    $('#lang-button-' + this.id).attr('title', langDef[lang].name)
    $('#lang-button-' + this.id).html(lang)
    this.defaultLang = lang
    this.setEditorMargin()

  }

  getParagraphType(p)
  {
    for (const blot of TranscriptionEditor.blockBlots) {
      if (p.hasClass(blot.className)) {
        return blot.name
      }
    }
    return 'normal'
  }

  calcEditorFontEmSize(fontSize) 
  {
    return 1 + fontSize*0.2
  }
  
  getEditorMarginSize() 
  {
    let factor = this.options.lineNumbers.fontFactor
    let charWidth = this.options.lineNumbers.charWidth
    let pixPerEm = this.options.pixPerEm
    let margin = this.options.lineNumbers.margin
    let editorFontSizeInEms = this.calcEditorFontEmSize(this.fontSize)
    let numChars = this.options.lineNumbers.numChars
   
    return (numChars*editorFontSizeInEms*pixPerEm*factor*charWidth) + 2*margin
  }
  
  static padNumber(number, places, char) 
  {
    let str = number.toString()
    let numberStr = ''
    for (let i=places; i > str.length; i--) {
      numberStr += char
    }
    numberStr += str
    return numberStr
  }
  
  setFontSize(fontSize)
  {
    let emSize = this.calcEditorFontEmSize(fontSize)
    $('#editor-container-' + this.id).css('font-size', emSize+'em')
    this.fontSize = fontSize
    this.setEditorMargin()
    // Update image blots
    for (let i = 0; i < TranscriptionEditor.imageBlots.length; i++){
      TranscriptionEditor.imageBlots[i].jsClass.size = this.fontSize
    }
  }
  
  setEditorMargin() 
  {
    let marginSize = this.getEditorMarginSize()
    if (this.options.langDef[this.defaultLang].rtl) {
      $('#editor-container-' + this.id + ' .ql-editor').css('margin-left', '0')
      $('#editor-container-' + this.id + ' .ql-editor').css('margin-right', marginSize + 'px')
      $('#editor-container-' + this.id + ' .ql-editor').css('border-right', 'solid 1px #e0e0e0')
      $('#editor-container-' + this.id + ' .ql-editor').css('border-left', 'none')
      return true
    }
    $('#editor-container-' + this.id + ' .ql-editor').css('margin-right', '0')
    $('#editor-container-' + this.id + ' .ql-editor').css('margin-left', marginSize + 'px')
    $('#editor-container-' + this.id + ' .ql-editor').css('border-left', 'solid 1px #e0e0e0')
    $('#editor-container-' + this.id + ' .ql-editor').css('border-right', 'none')
    return true
  }

  makeTextSmaller()
  {
    if (this.fontSize > this.options.minFontSize) {
      this.setFontSize(this.fontSize - 1)
    }
  }

  makeTextBigger()
  {
    if (this.fontSize < this.options.maxFontSize) {
      this.setFontSize(this.fontSize + 1)
    }
  }

  numberLines()
  {
    let pElements = $('#' + this.containerId + ' ' + '.ql-editor > p')
    console.log('Numbering lines in editor ' + this.id + ', ' + pElements.length + ' elements')
    let editorDiv = $('#' + this.containerId + ' ' + '.ql-editor')
    let editorContainerLeftPos = $(editorDiv).position().left
    let marginSize = this.getEditorMarginSize()
    let lineNumber = 0
    let overlayNumber = 0
    let inMarginal = false
    let lastMarginalId = -1
    let numChars = this.options.lineNumbers.numChars;
    let lastMarginalP = undefined
    for (const p of pElements) {
      let theP = $(p)
      let lineNumberLabel = '-'
      switch (this.getParagraphType(theP)) {
        case 'normal':
          inMarginal = false
          let children = theP.children()
          if (children.length === 1) {
            let theChild = $(children[0])
            if (theChild.hasClass('linegap')) {
              lineNumber += parseInt(theChild.attr('length'))
              lineNumberLabel = ''
              break
            }
          }
          lineNumberLabel = TranscriptionEditor.padNumber(++lineNumber, numChars, '&nbsp;')
          break

        case 'custodes':
          inMarginal = false
          lineNumberLabel = '<a title="Custodes">&nbsp;C</a>'
          break

        case 'pagenumber':
          inMarginal = false
          lineNumberLabel = '<a title="Page Number">PN</a>'
          break

        case 'headelement':
          inMarginal = false
          lineNumberLabel = '<a title="Head">&nbsp;H</a>'
          break
          
        case 'gloss':
          let place = theP.attr('place')
          let elementId = theP.attr('elementid')
          lastMarginalP = theP
          if (!inMarginal || elementId !== lastMarginalId) {
            // first line of marginal
            lastMarginalId = elementId
            theP.addClass('firstmarginalline')
            lineNumberLabel = '<a title="Gloss @ ' + place + '">&nbsp;G</a>'
          } else {
            theP.removeClass('firstmarginalline')
            lineNumberLabel = ''
          }
          inMarginal = true
          break
        
        case 'addition':
          place = theP.attr('place')
          elementId = theP.attr('elementid')
          if (!inMarginal || elementId !== lastMarginalId) {
            // first line of marginal
            lastMarginalId = elementId
            theP.addClass('firstmarginalline')
          } else {
            theP.removeClass('firstmarginalline')
          }
          lineNumberLabel = '<a title="Addition @ ' + place + '">&nbsp;A</a>'
          inMarginal = true
          break
      }
      if (!inMarginal && lastMarginalP !== undefined) {
        lastMarginalP.addClass('lastmarginalline')
        lastMarginalP = undefined
      }
      if (lineNumberLabel === '') {
        continue
      }
      let offset = theP.position()
      let fontFactor = this.options.lineNumbers.fontFactor 
      let editorFontSize = this.calcEditorFontEmSize(this.fontSize)*this.options.pixPerEm
      let lineNumberTopPos = offset.top 
              + $('#editor-container-' + this.id).position().top 
              + parseInt(theP.css('marginTop'))
      let fontEmSize = this.calcEditorFontEmSize(this.fontSize)*fontFactor
      let fontCharWidth = fontEmSize*this.options.pixPerEm*this.options.lineNumbers.charWidth
      let numberMargin = this.options.lineNumbers.margin;
      
      let lineNumberLeftPos = editorContainerLeftPos + marginSize - numberMargin - numChars*fontCharWidth;
      if (this.defaultLang !== 'la') {
        lineNumberLeftPos = editorContainerLeftPos + $(editorDiv).outerWidth() + numberMargin;
      }
      let overlay = ''
      overlayNumber++
      let overlayId = this.containerId + '-lnr-' + overlayNumber
      overlay = '<div class="linenumber" id="' +
              overlayId +
              '" style="position: absolute;' + 
              'top:' +  lineNumberTopPos + 'px; ' + 
              'left: ' + lineNumberLeftPos + 'px; ' + 
              'line-height: ' + this.options.editorLineHeight*editorFontSize + 'px;' +
              'font-size:' + fontEmSize + 'em; ' +
              'width: ' +  (numChars*fontCharWidth) + 'px;' +
              'height: ' + this.options.editorLineHeight*editorFontSize + 'px;' +  
              '">' +
              lineNumberLabel +
              '</div>'
      $('#' + overlayId).remove()
      $('#' + this.containerId).append(overlay)
    }
    if (this.numpElements > pElements.length) {
      for (let i = pElements.length + 1; i <= this.numpElements; i++) {
        let overlayId = this.containerId + '-lnr-' + i
        $('#' + overlayId).remove()
      }
    }
    this.numpElements = pElements.length

  }
  
  dispatchEvent(eventName)
  {
    const event = new Event(eventName)
    $('#' + this.containerId).get()[0].dispatchEvent(event)
  }
  
  /**
   * Attaches a callback function to an editor event
   * 
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f) 
  {
    for(const ev of TranscriptionEditor.events) {
      if (ev === eventName) {
          $('#' + this.containerId).on(eventName, f)
          return true
      }
    }
    return false
  }
  
 /**
  * Enables the editor
  * 
  * @event Emits the 'edit-enable' event when done.
  */
  enable() {
    this.enabled = true
    $('#toolbar-'+ this.id).show()
    this.quillObject.enable(this.enabled)
    $('#save-button-' + this.id).prop('disabled', true)
    $('#reset-button-' + this.id).prop('disabled', true)
    $('#save-button-' + this.id).show()
    $('#reset-button-' + this.id).show()
    $('#toggle-button-' + this.id).prop('title', 'Leave editor')
    $('#toggle-button-' + this.id).html('<i class="fa fa-power-off"></i>')
//    this.resizeEditor()
    this.lastSavedData = this.quillObject.getContents()
    this.setContentsNotChanged()
    this.quillObject.setSelection(this.quillObject.getLength())
    this.dispatchEvent('editor-enable')
  }
  
  /**
   * Disables the editor
   * @event Emits the 'edit-disable' event when done
   * @returns {Boolean}
   */
  disable() {
    const thisObject = this
    if (this.contentsChanged) {
      $('#alert-modal-title-' + this.id).html('There are changes to the text')
      $('#alert-modal-text-' + this.id).html(
          '<p>Are you sure you want to leave the editor?</p><p class="text-danger">Changes will be lost!</p>')
      $('#alert-modal-submit-button-' + thisObject.id).html('Yes, leave!')
      $('#alert-modal-cancel-button-' + thisObject.id).html('Cancel')
      $('#alert-modal-submit-button-' + this.id).off()
      $('#alert-modal-submit-button-' + this.id).on('click', function () {
          //console.log("User wants to drop changes in editor")
          $('#alert-modal-' + thisObject.id).modal('hide')
          thisObject.enabled = false
          $('#toolbar-' + thisObject.id).hide()
          $('#save-button-' + thisObject.id).hide()
          $('#reset-button-' + thisObject.id).hide()
          $('#toggle-button-' + thisObject.id).prop('title', 'Edit')
          $('#toggle-button-' + thisObject.id).html('<i class="fa fa-pencil"></i>')
          thisObject.quillObject.setContents(thisObject.lastSavedData)
          thisObject.quillObject.enable(thisObject.enabled)
          thisObject.setContentsNotChanged()
          //thisObject.resizeEditor()
          thisObject.numberLines()
          thisObject.dispatchEvent('editor-disable')
        })
      $('#alert-modal-' + this.id).modal('show')
      return true
    }
    this.enabled = false
    $('#toolbar-' + this.id).hide()
    $('#save-button-' + this.id).hide()
    $('#reset-button-' + this.id).hide()
    $('#toggle-button-' + this.id).prop('title', 'Edit')
    $('#toggle-button-' + this.id).html('<i class="fa fa-pencil"></i>')
    this.quillObject.enable(this.enabled)
    this.contentsChanged = false
    //this.resizeEditor()
    thisObject.numberLines()
    this.dispatchEvent('editor-disable')
  }
  
  toggleEnable() {
    if (this.enabled) {
      this.disable()
    } else {
      this.enable()
    }
  }
  
  setContentsChanged() {
    $('#save-button-' + this.id).prop('disabled', false)
    $('#reset-button-' + this.id).prop('disabled', false)
    this.contentsChanged = true
  }
  
  setContentsNotChanged() {
    $('#save-button-' + this.id).prop('disabled', true)
    $('#reset-button-' + this.id).prop('disabled', true)
    this.contentsChanged = false
  }

  /**
   * Enters the editor into save mode
   * 
   * Emits an 'editor-save' event that the application should process
   * On a successful save the application should call the saveSuccess or saveFail methods
   * to bring back the editor into a normal state.
   * 
   * 
   * @returns {Boolean}
   */
  save() {
    if (!this.contentsChanged) {
      // No changes, return
      return true
    }
    this.saving = true
    $('#save-button-' + this.id).prop('title', 'Saving changes...')
    $('#save-button-' + this.id).html('<i class="fa fa-spinner fa-spin fa-fw"></i>')
    this.quillObject.enable(false)
    this.dispatchEvent('editor-save')
  }
  
  saveSuccess(newData) {
    this.lastSavedData = newData
    this.setData(newData)
    this.setContentsNotChanged()
    this.saving = false
    $('#save-button-' + this.id).prop('title', 'Save changes')
    $('#save-button-' + this.id).html('<i class="fa fa-save"></i>')
    this.quillObject.enable(true)
  }
  
  saveFail(reason) {
    this.saving = false
    $('#save-button-' + this.id).prop('title', 'Could not save: ' + reason + ' (click to try again)')
    $('#save-button-' + this.id).html('<span class="fa-stack"><i class="fa fa-save fa-stack-1x"></i><i class="fa fa-exclamation-triangle fa-stack-1x text-danger"></i></span>')
    this.quillObject.enable(true)
  }
  
  reset() {
    this.quillObject.setContents(this.lastSavedData)
    $('#save-button-' + this.id).prop('title', 'Save changes')
    $('#save-button-' + this.id).html('<i class="fa fa-save"></i>')
    this.dispatchEvent('editor-reset')
  }
  
  setDisableLangButtons (disable = true) {
    for (const lang in this.options.langDef) {
      $('#' + lang + '-button-' + this.id).prop('disabled', disable)
    }
  }

  getData()
  {
     return EditorData.getApiDataFromQuillDelta(this.quillObject.getContents(), this, TranscriptionEditor.blockBlots, TranscriptionEditor.formatBlots)
  }
  
  getOneItemId () {
    if (this.minItemId >= 0) {
      this.minItemId = -1000
    }
    this.minItemId--
    return this.minItemId
  }

  getOneNoteId () {
    if (this.minNoteId >= 0) {
      this.minNoteId = -100
    }
    this.minNoteId--
    return this.minNoteId
  }
  
  static getMainLanguage(languageCounts) {
    let max = 0
    let mainLanguage = false
    for (const lang in languageCounts) {
      if (languageCounts[lang]===0) {
        continue
      }
      if (languageCounts[lang]>= max) {
        max = languageCounts[lang]
        mainLanguage = lang
      }
    }
    return mainLanguage
  }
  
  /**
    * Loads the given elements and items into the editor.
    * @param {array} columnData Data from API
    * @returns {none} Nothing.
    */
  setData (columnData) {
    if (columnData === null) {
      this.edNotes = []
      //this.people = []
      this.pageId = 1
      this.columnNumber = 1
      this.pageDefaultLang = this.defaultLang
      this.info = {}
      this.info.pageId = this.pageId
      this.info.col = 1
      this.info.lang = this.defaultLang
      this.info.numCols = 1
      return true
    }
    
    this.edNotes = columnData.ednotes
    for (const note of this.edNotes) {
      this.minNoteId = Math.min(this.minNoteId, note.id)
    }

    this.people = columnData.people
    this.pageId = columnData.info.pageId
    this.columnNumber = columnData.info.col
    this.pageDefaultLang = columnData.info.lang
    
    let editorData = EditorData.getEditorDataFromApiData(columnData, this.id, this.options.langDef, this.minItemId, TranscriptionEditor.formatBlots)
  
    this.minItemId = editorData.minItemId
    this.quillObject.setContents(editorData.delta)
    this.lastSavedData = this.quillObject.getContents()
    let mainLang = editorData.mainLang
    if (!mainLang) {
      mainLang = this.pageDefaultLang
    }
    
    this.setDefaultLang(mainLang)
    console.log('Set Data')
    this.numberLines()
  }
  
  getQuillData() 
  {
    return this.quillObject.getContents()
  }
  
  genOnClickNoteButton()
  {
    let thisObject = this
    let quillObject = this.quillObject
    return function () {
      const range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Note')
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
                // Take care of notes!
        const noteText = $('#item-note-' + thisObject.id).val()
        if (noteText !== '') {
          const itemId = thisObject.getOneItemId()
          thisObject.addNewNote(itemId, noteText)
          quillObject.insertEmbed(range.index, 'mark', {
            itemid: itemId,
            editorid: thisObject.id
          })
          quillObject.setSelection(range.index + 1)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    }
  }
  
  genOnClickLineGapButton()
  {
    let thisObject = this
    let quillObject = this.quillObject
    return function () {
      const range = quillObject.getSelection()
      if (!range || range.length > 0) {
        return false
      }
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Line Gap')
      $('#item-modal-text-fg-' + thisObject.id).hide()
      $('#item-modal-alttext-fg-' + thisObject.id).hide()
      $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
      $('#item-modal-length-label-' + thisObject.id).html('Lines not transcribed:')
      $('#item-modal-length-' + thisObject.id).val(1)
      $('#item-modal-length-fg-' + thisObject.id).show()
      $('#item-modal-ednote-fg-' + thisObject.id).hide()
      $('#item-modal-submit-button-' + thisObject.id).off()
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        const count = $('#item-modal-length-' + thisObject.id).val()
        if (count <= 0) {
          //console.log("Bad line count for line gap: " + count)
          return false
        }
        thisObject.insertLineGap(range.index, count)
      })
      $('#item-modal-' + thisObject.id).modal('show')
    }
  }
  
  insertLineGap(position, count) {
    if (position !== 0) {
      this.quillObject.insertText(position, '\n')
      position++
    }
   this.quillObject.insertEmbed(position, 'linegap', {
          editorid: this.id,
          thelength: count
    })
    this.quillObject.insertText(position+1, '\n')
    this.quillObject.setSelection(position +2)
  }

  genOnQuillChange()
  {
    let thisObject = this
    return function (delta, oldDelta, source)
    {
      if (!thisObject.enabled) {
        return false
      }
      if (!_.isEqual(thisObject.quillObject.getContents(), thisObject.lastSavedData)) {
        thisObject.setContentsChanged()
      } else {
        thisObject.setContentsNotChanged()
      }
      console.log('Quill change')
      thisObject.numberLines()
    }
  }
  
  genOnSelectionChange() 
  {
    let thisObject = this
    let quillObject = this.quillObject
    let id = this.id
    return function (range) {
      if (!range) {
        return false
      }
      if (!thisObject.enabled) {
        return false
      }
      //console.log("Selection: @" + range.index + ", l=" + range.length)
      const hasFormat = TranscriptionEditor.selectionHasFormat(quillObject, range)
      //console.log("Has format: " + hasFormat)
      if (range.length === 0) {
        $('.selFmtBtn').prop('disabled', true)
        $('.imgFmtBtn').prop('disabled', false)
        $('.chunkButton').prop('disabled', false)
        $('.lineGapButton').prop('disabled', false)
        $('#note-button-' + id).prop('disabled', false)
        thisObject.setDisableLangButtons(true)
        $('#edit-button-' + id).prop('disabled', true)
        if (TranscriptionEditor.rangeIsInMidItem(quillObject, range)) {
          $('#note-button-' + id).prop('disabled', true)
          $('#edit-button-' + id).prop('disabled', false)
          $('.imgFmtBtn').prop('disabled', true)
          return false
        }
        if (!TranscriptionEditor.indexIsInNormalLine(quillObject, range.index)) {
            $('.chunkButton').prop('disabled', true)
            $('.lineGapButton').prop('disabled', true)
        }
        return false
      }
      // Selection's length >= 1
      $('.imgFmtBtn').prop('disabled', true)
      $('#note-button-' + id).prop('disabled', true)
      
      const text = quillObject.getText(range)
      if (text.search('\n') !== -1) {
        // Selection includes new lines
        $('.selFmtBtn').prop('disabled', true)
        thisObject.setDisableLangButtons(false)
        return false
      }
      // Selection does not include new lines
      thisObject.setDisableLangButtons(false)
      if (hasFormat) {
        $('.selFmtBtn').prop('disabled', true)
        $('#clear-button-' + id).prop('disabled', false)
        if (TranscriptionEditor.rangeIsInMidItem(quillObject, range)) {
          $('#edit-button-' + id).prop('disabled', false)
          $('#clear-button-' + id).prop('disabled', true)
          return false
        }
        $('#edit-button-' + id).prop('disabled', true)
      } else {
        $('.selFmtBtn').prop('disabled', false)
        $('#edit-button-' + id).prop('disabled', true)
        $('#clear-button-' + id).prop('disabled', true)
      }
    }
  }
  
  genChunkButtonFunction(type) {
    let thisObject = this
    let quillObject = this.quillObject
    return function () {
      const range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      $('#chunk-modal-title-' + thisObject.id).html('Chunk ' + type)
      $('#chunk-modal-worknumber-' + thisObject.id).val(1)
      $('#chunk-modal-chunknumber-' + thisObject.id).val(1)

      $('#chunk-modal-submit-button-' + thisObject.id).off()
      $('#chunk-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#chunk-modal-' + thisObject.id).modal('hide')
        const itemid = thisObject.getOneItemId()
        const dareid = 'AW'+ $('#chunk-modal-worknumber-' + thisObject.id).val()
        const chunkno = $('#chunk-modal-chunknumber-' + thisObject.id).val()
        quillObject.insertEmbed(range.index, 'chunkmark', {
          alttext: type,
          target: chunkno,
          text: dareid,
          itemid: itemid,
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + 1)
                // Take care of notes!
        const noteText = $('#chunk-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(itemid, noteText)
        }
      })
      $('#chunk-modal-' + thisObject.id).modal('show')
    }
  }

  genOnResize()
  {
    let thisObject = this
    return function (e)
    {
      console.log('Resize')
      thisObject.numberLines()
    }
  }

  genOnClickLangButton(lang) {
    let quillObject = this.quillObject
    return function () {
      quillObject.format('lang', lang)
      const range = quillObject.getSelection()
      quillObject.setSelection(range.index + range.length)
    }
  }
  
  getTargets (itemId = -1) {
    const ops = this.quillObject.getContents().ops
    const targets = [{itemid: -1, text: '[none]'}]
    const potentialTargets = []
   
    const additionTargets = []
    for (const curOps of ops) {
      if (curOps.insert !== '\n' &&
                        'attributes' in curOps) {
        if (curOps.attributes.deletion) {
          potentialTargets.push({
            itemid: parseInt(curOps.attributes.deletion.itemid),
            text: 'DELETION: ' + curOps.insert
          })
        }
        if (curOps.attributes.unclear) {
          potentialTargets.push({
            itemid: parseInt(curOps.attributes.unclear.itemid),
            text: 'UNCLEAR: ' + curOps.insert
          })
        }
        if (curOps.attributes.addition) {
          if (curOps.attributes.addition.itemid !== itemId) {
            additionTargets[curOps.attributes.addition.target] = true
          }
        }
      }
    }

    for (const pTarget of potentialTargets) {
      if (!(pTarget.itemid in additionTargets)) {
        targets.push(pTarget)
      }
    }
    return targets
  }

  genOnClickSimpleFormat(theBlot, value = {}) {
    let thisObject = this
    let quillObject = this.quillObject
    return function () {
      if (!thisObject.enabled) {
        return true
      }
      let needsDialog = false
      const itemId = thisObject.getOneItemId()
      let theValue =  {
        itemid: itemId,
        editorid: thisObject.id,
        handid: 0
      }
      
      let fields = ['text', 'alttext', 'extrainfo', 'target', 'thelength']
      
      for (const theField of fields) {
        if (theBlot[theField] !== undefined) {
          if (value[theField] === undefined) {
            if (theBlot[theField].default !== undefined) {
              console.warn('Need ' + theField + ' for blot \''  + theBlot.name + '\' but none given, using default')
              value[theField] = theBlot[theField].default
            } else {
              needsDialog = true
            }
          }
          theValue[theField] = value[theField]
        }
      }
      if (theBlot.forceInputDialog) {
        needsDialog = true
      }
      // Deal with target field 
      let targets = []
      if (theBlot.target) {
        targets = thisObject.getTargets()
        if (theBlot.target.default === -1) {
          theValue.targetText = '[none]'
        }
      }
      
      if (!needsDialog) {
        quillObject.format(theBlot.name, theValue)
        const range = quillObject.getSelection()
        quillObject.setSelection(range.index + range.length)
        return true
      }
      // Let's fire up the modal
      const range = quillObject.getSelection()
      const text = quillObject.getText(range.index, range.length)
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html(theBlot.title)
      $('#item-modal-text-' + thisObject.id).html(text)
      $('#item-modal-text-fg-' + thisObject.id).show()
      if (theBlot.alttext) {
        $('#item-modal-alttext-label-' + thisObject.id).html(theBlot.alttext.title)
        $('#item-modal-alttext-' + thisObject.id).val('')
        $('#item-modal-alttext-fg-' + thisObject.id).show()
      }
      if (theBlot.extrainfo) {
        $('#item-modal-extrainfo-label-' + thisObject.id).html(theBlot.extrainfo.title)
        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
        let optionsHtml = ''
        for (const option of theBlot.extrainfo.options) {
          optionsHtml += '<option value="' + option + '"'
          optionsHtml += '>' + option + '</option>'
        }
        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
      }
      if (theBlot.target) {
        let targetsHtml = ''
        for (const theTarget of targets) {
          targetsHtml += '<option value="' + theTarget.itemid + '"'
          if (theTarget.itemid === theValue.target) {
            targetsHtml += ' selected'
          }
          targetsHtml += '>' + theTarget.text + '</option>'
        }
        $('#item-modal-target-' + thisObject.id).html(targetsHtml)
        $('#item-modal-target-label-' + thisObject.id).html(theBlot.target.title)
        $('#item-modal-target-fg-' + thisObject.id).show()
      }
      
      // hands
      
      let handsHtml = ''
      for (const hand of thisObject.options.hands) {
          handsHtml += '<option value="' + hand.id + '"'
          if (hand.id === theValue.handid) {
            handsHtml += ' selected'
          }
          handsHtml += '>' + hand.name + '</option>'
        }
      $('#item-modal-hand-' + thisObject.id).html(handsHtml)
      $('#item-modal-hand-fg-' + thisObject.id).show()
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        if (theBlot.alttext) {
          theValue.alttext = $('#item-modal-alttext-' + thisObject.id).val()
        }
        if (theBlot.extrainfo) {
          theValue.extrainfo = $('#item-modal-extrainfo-' + thisObject.id).val()
        }
        theValue.handid = $('#item-modal-hand-' + thisObject.id).val()
        quillObject.format(theBlot.name, theValue)
        quillObject.setSelection(range.index + range.length)
        // Take care of notes!
        const noteText = $('#item-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(theValue.itemid, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
  }
  }
  
  genOnClickClearFormats() {
    let quillObject = this.quillObject
    let thisObject = this
    return function () {
      const range = quillObject.getSelection()
      if (TranscriptionEditor.selectionHasFormat(quillObject, range)) {
        $('#alert-modal-title-' + thisObject.id).html('Please confirm')
        $('#alert-modal-submit-button-' + thisObject.id).html('Clear formatting')
        $('#alert-modal-cancel-button-' + thisObject.id).html('Cancel')
        $('#alert-modal-text-' + thisObject.id).html(
                        'Are you sure you want to clear formatting of this text?</p>'+ 
                        '<p>Formats and notes will be lost.</p>' + 
                        '<p class="text-danger">This can NOT be undone!')
        $('#alert-modal-submit-button-' + thisObject.id).off()
        $('#alert-modal-submit-button-' + thisObject.id).on('click', function () {
          $('#alert-modal-' + thisObject.id).modal('hide')
          TranscriptionEditor.removeFormat(quillObject, range)
        })
        $('#alert-modal-' + thisObject.id).modal('show')
      } else {
        TranscriptionEditor.removeFormat(quillObject, range)
      }
    }
  }
  
  genOnClickZoomButton(type)
  {
    let thisObject = this
    return function ()
    {
      switch (type) {
        case 'in':
          thisObject.makeTextBigger()
          break;

        case 'out':
          thisObject.makeTextSmaller()
          break;
      }
      thisObject.numberLines()
      return true
    }
  }

  genOnClickSimpleBlockButton(theBlot, value = {}) 
  {
    let thisObject = this
    let quillObject = this.quillObject
    return function ()
    {
      if (!thisObject.enable) {
        return true
      }
      let needsDialog = false
      const elementId = thisObject.getOneItemId()
      let theValue =  {
        elementId: elementId,
        editorid: thisObject.id
      }
      
      let fields = ['place']
      for (const theField of fields) {
        if (theBlot[theField] !== undefined) {
          if (value[theField] === undefined) {
            if (theBlot[theField].default !== undefined) {
              console.warn('Need ' + theField + ' for blot \''  + theBlot.name + '\' but none given, using default')
              value[theField] = theBlot[theField].default
            } else {
              needsDialog = true
            }
          }
          theValue[theField] = value[theField]
        }
      }
      if (theBlot.forceInputDialog) {
        needsDialog = true
      }
      if (!needsDialog) {
        quillObject.format(theBlot.name, theValue)
        // Disable chunk and line gap buttons 
        $('.chunkButton').prop('disabled', true)
        $('.lineGapButton').prop('disabled', true)
        return true
      }
      // Needs dialog
      console.warn('Block blot needs dialog... not implemented yet')
    }
  }

  genOnClickToggleEnableButton()
  {
    let thisObject = this
    return function ()
    {
      thisObject.toggleEnable()
      thisObject.numberLines()
      return true
    }
  }
  genOnClickLineButton()
  {
    let quillObject = this.quillObject
    return function ()
    {
      for(const blockBlot of TranscriptionEditor.blockBlots) {
        quillObject.format(blockBlot.name, false)
      }
      let currentSelection = quillObject.getSelection()
      if (currentSelection.length === 0) {
        // if cursor in a single place, check
        // and enable/disable chunk and line gap buttons
        if (!TranscriptionEditor.rangeIsInMidItem(quillObject, currentSelection)) {
          $('.chunkButton').prop('disabled', false)
          $('.lineGapButton').prop('disabled', false)
          return true
        }
        $('.chunkButton').prop('disabled', true)
        $('.lineGapButton').prop('disabled', true)
        return true
      }
      // Move cursor to end of selection 
      // this forces a selection change event and a 
      // proper setting of the button status
      quillObject.setSelection(currentSelection.index + currentSelection.length)
    }
  }

  genOnClickSetLang(lang)
  {
    let thisObject = this
    return function ()
    {
      thisObject.setDefaultLang(lang)
      thisObject.setEditorMargin(thisObject.fontSize)
      $('#lang-button-' + thisObject.id).html(lang)
      thisObject.numberLines()
    }
  }
  
  genOnClickSaveButton()
  {
    let thisObject = this
    return function(){
      thisObject.save()
      return true
    }
  }
  
  genOnClickResetButton()
  {
    let thisObject = this
    return function(){
      thisObject.reset()
      return true
    }
  }
  
  setupModalForSimpleImageBlog(thisObject, theBlot, theValue)
  {
    TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html(theBlot.title)
      if (theBlot.text) {
        $('#item-modal-text-' + thisObject.id).html(theValue.text)
        $('#item-modal-text-fg-' + thisObject.id).show()
      }
      if (theBlot.alttext) {
        $('#item-modal-alttext-label-' + thisObject.id).html(theBlot.alttext.title)
        $('#item-modal-alttext-' + thisObject.id).val(theValue.alttext)
        $('#item-modal-alttext-fg-' + thisObject.id).show()
      }
      if (theBlot.extrainfo) {
        $('#item-modal-extrainfo-label-' + thisObject.id).html(theBlot.extrainfo.title)
        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
        let optionsHtml = ''
        for (const option of theBlot.extrainfo.options) {
          optionsHtml += '<option value="' + option + '"'
          if (option === theBlot.extrainfo.default) {
            optionsHtml += ' selected'
          }
          optionsHtml += '>' + option + '</option>'
        }
        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
      }
      if (theBlot.thelength) {
        $('#item-modal-length-label-' + thisObject.id).html(theBlot.thelength.title)
        $('#item-modal-length-' + thisObject.id).val(theValue.thelength)
        $('#item-modal-length-' + thisObject.id).attr('min',theBlot.thelength.min)
        $('#item-modal-length-' + thisObject.id).attr('max',theBlot.thelength.max)
        $('#item-modal-length-fg-' + thisObject.id).show()
      }
  }
  
  genOnClickSimpleImageButton(theBlot, value = {}) 
  {
    let quillObject = this.quillObject
    let thisObject = this
    return function () {
      const range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      let needsDialog = false
      const itemId = thisObject.getOneItemId()
      let theValue = {
            itemid: itemId,
            editorid: thisObject.id
      }
      let fields = ['text', 'alttext', 'extrainfo', 'target', 'thelength']
      
      for (const theField of fields) {
        if (theBlot[theField] !== undefined) {
          if (value[theField] === undefined) {
            if (theBlot[theField].default !== undefined) {
              console.warn('Need ' + theField + ' for blot \''  + theBlot.name + '\' but none given, using default')
              value[theField] = theBlot[theField].default
            } else {
              needsDialog = true
            }
          }
          theValue[theField] = value[theField]
        }
      }
      if (theBlot.forceInputDialog) {
        needsDialog = true
      }
      if (!needsDialog) {
        quillObject.insertEmbed(range.index, theBlot.name, theValue)
        quillObject.setSelection(range.index + 1)
        return true
      }
      // Let's fire up the modal
      thisObject.setupModalForSimpleImageBlog(thisObject, theBlot, theValue)
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
          $('#item-modal-' + thisObject.id).modal('hide')
          if (theBlot.alttext) {
            theValue.alttext = $('#item-modal-alttext-' + thisObject.id).val()
          }
          if (theBlot.extrainfo) {
            theValue.extrainfo = $('#item-modal-extrainfo-' + thisObject.id).val()
          }
          if (theBlot.thelength) {
            theValue.thelength = $('#item-modal-length-' + thisObject.id).val()
          }
          quillObject.insertEmbed(range.index, theBlot.name, theValue)
          quillObject.setSelection(range.index + 1)
          // Take care of notes!
          const noteText = $('#item-note-' + thisObject.id).val()
          if (noteText !== '') {
            thisObject.addNewNote(theValue.itemid, noteText)
          }
        })
        $('#item-modal-' + thisObject.id).modal('show')
      
    }
  }
  
  genOnClickSpecialCharacterButton(char) 
  { 
    let quillObject = this.quillObject
    return function () {
      const range = quillObject.getSelection()
      quillObject.insertText(range.index, char.character)
      quillObject.setSelection(range.index + 1)
    }
  }
  
  genOnDoubleClickSimpleFormat() {
    let thisObject = this
    let quillObject = this.quillObject
    return function (event) {
      if (!thisObject.enabled) {
        return true
      }
      console.log('Double click on simple format')
      const blot = Quill.find(event.target)
      const range = {
        index: blot.offset(quillObject.scroll),
        length: blot.length()
      }
      quillObject.setSelection(range)
      $('#edit-button-' + thisObject.id).prop('disabled', false)
    }
  }
  
  genOnDoubleClickSimpleEmbed (theBlot) {
    let thisObject = this
    let quillObject = this.quillObject
  
    return function (event) {
      if (!thisObject.enabled) {
        return true
      }
      const blot = Quill.find(event.target)
      const range = {
        index: blot.offset(quillObject.scroll),
        length: blot.length()
      }
      quillObject.setSelection(range)
      const delta = quillObject.getContents(range.index, range.length)
      TranscriptionEditor.resetItemModal(thisObject.id)
      if (!delta.ops[0].insert[theBlot.name]) {
         console.warn('Double click on embed without proper value')
         return false
      }
      let value = delta.ops[0].insert[theBlot.name]
      // Let's fire up the modal
      thisObject.setupModalForSimpleImageBlog(thisObject, theBlot, value)
      TranscriptionEditor.setupNotesInItemModal(thisObject, value.itemid)
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
          $('#item-modal-' + thisObject.id).modal('hide')
          if (theBlot.alttext) {
            value.alttext = $('#item-modal-alttext-' + thisObject.id).val()
          }
          if (theBlot.extrainfo) {
            value.extrainfo = $('#item-modal-extrainfo-' + thisObject.id).val()
          }
          if (theBlot.thelength) {
            value.thelength = $('#item-modal-length-' + thisObject.id).val()
          }
          quillObject.deleteText(range.index, 1)
          quillObject.insertEmbed(range.index, theBlot.name, value)
          quillObject.setSelection(range.index + 1)

          // Take care of notes!
          const noteId = $('#item-note-id-' + thisObject.id).val()
          const noteText = $('#item-note-' + thisObject.id).val()
          if (noteId === 'new') {
            thisObject.addNewNote(value.itemid, noteText)
          } else {
            thisObject.updateNote(noteId, noteText)
          }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    }
  }
  
  genOnClickEdit() {
    let quillObject = this.quillObject
    let thisObject = this
    return function () {
      // Set selection to the whole item
      const currentRange = quillObject.getSelection()
      const blot = quillObject.getLeaf(currentRange.index+1)[0]
      const range = {
        index: blot.offset(quillObject.scroll),
        length: blot.length()
      }
      quillObject.setSelection(range)

      const format = quillObject.getFormat(range)
      const text = quillObject.getText(range.index, range.length)
      let altText = ''
      let itemid = -1
      let targets = []
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Unknown')
      for (const formatBlot of TranscriptionEditor.formatBlots) {
        if (format[formatBlot.name]) {
          itemid = format[formatBlot.name].itemid
          $('#item-modal-title-' + thisObject.id).html(formatBlot.title)
          $('#item-modal-text-fg-' + thisObject.id).show()
          $('#item-modal-alttext-fg-' + thisObject.id).hide()
          if (formatBlot.alttext) {
            altText = format[formatBlot.name].alttext
            $('#item-modal-alttext-' + thisObject.id).val(altText)
            $('#item-modal-alttext-label-' + thisObject.id).html(formatBlot.alttext.title)
            $('#item-modal-alttext-fg-' + thisObject.id).show()
          }
          $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
          if (formatBlot.extrainfo) {
            $('#item-modal-extrainfo-label-' + thisObject.id).html(formatBlot.extrainfo.title)
            $('#item-modal-extrainfo-fg-' + thisObject.id).show()
            let optionsHtml = ''
            for (const option of formatBlot.extrainfo.options) {
              optionsHtml += '<option value="' + option + '"'
              if (option === format[formatBlot.name].extrainfo) {
                optionsHtml += ' selected'
              }
              optionsHtml += '>' + option + '</option>'
            }
            $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
          }
          if (formatBlot.target) {
            targets = thisObject.getTargets()
            let targetsHtml = ''
            for (const theTarget of targets) {
              targetsHtml += '<option value="' + theTarget.itemid + '"'
              if (theTarget.itemid === format[formatBlot.name].target) {
                targetsHtml += ' selected'
              }
              targetsHtml += '>' + theTarget.text + '</option>'
            }
            $('#item-modal-target-' + thisObject.id).html(targetsHtml)
            $('#item-modal-target-label-' + thisObject.id).html(formatBlot.target.title)
            $('#item-modal-target-fg-' + thisObject.id).show()
          }
          let handsHtml = ''
          // hands
          for (const hand of thisObject.options.hands) {
              handsHtml += '<option value="' + hand.id + '"'
              if (hand.id === parseInt(format[formatBlot.name].handid)) {
                handsHtml += ' selected'
              }
              handsHtml += '>' + hand.name + '</option>'
            }
          $('#item-modal-hand-' + thisObject.id).html(handsHtml)
          $('#item-modal-hand-fg-' + thisObject.id).show()
          break
        }
      }
      TranscriptionEditor.setupNotesInItemModal(thisObject, itemid)
      $('#item-modal-text-' + thisObject.id).html(text)

      $('#item-modal-cancel-button-' + thisObject.id).on('click', function () {
                // $('#item-modal-' + thisObject.id).modal('hide');
        quillObject.setSelection(currentRange)
      })
      $('#item-modal-submit-button-' + thisObject.id).off()
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        for (const formatBlot of TranscriptionEditor.formatBlots) {
          if (format[formatBlot.name]) {
            let value = {itemid: itemid, editorid: thisObject.id}
            value.handid = $('#item-modal-hand-' + thisObject.id).val()
            if (formatBlot.alttext) {
              value.alttext = $('#item-modal-alttext-' + thisObject.id).val()
            }
            if (formatBlot.extrainfo) {
              value.extrainfo = $('#item-modal-extrainfo-' + thisObject.id).val()
            }
            if (formatBlot.target) {
              const target = parseInt($('#item-modal-target-' + thisObject.id).val())
              let targetText = ''
              for (const someT of targets) {
                if (target === someT.itemid) {
                  targetText = someT.text
                  break
                }
              }
              value.target = target
              value.targetText = targetText
            }
            quillObject.format(formatBlot.name, value) 
          }
        }
        quillObject.setSelection(range.index + range.length)
        // Then, care of editorial notes
        const noteId = $('#item-note-id-' + thisObject.id).val()
        const noteText = $('#item-note-' + thisObject.id).val()
        if (noteId === 'new') {
          thisObject.addNewNote(itemid, noteText)
        } else {
          thisObject.updateNote(noteId, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    }
  }
  
  addNewNote (itemId, text) {
    if (text === '') {
      return false
    }
    if (typeof itemId === 'string') {
      itemId = parseInt(itemId)
    }
    const noteId = this.getOneNoteId()
    console.log('Adding new note ' + noteId)
    this.edNotes.push({
      id: noteId,
      authorId: this.editorId,
      target: itemId,
      type: 2,
      text: text,
      time: TranscriptionEditor.getMySqlDate(new Date()),
      lang: 'en'
    })
  }

  updateNote (noteId, text) {
    if (typeof noteId === 'string') {
      noteId = parseInt(noteId)
    }
    let indexToErase = -1
    for (let i = 0; i < this.edNotes.length; i++) {
      if (this.edNotes[i].id === noteId) {
        if (text.trim() === '') {
          indexToErase = i
          break
        }
        this.edNotes[i].text = text
        this.edNotes[i].time = TranscriptionEditor.getMySqlDate(new Date())
        break
      }
    }
    if (indexToErase !== -1) {
      this.edNotes.splice(indexToErase, 1)
    }
  }
  
  static setupNotesInItemModal (thisObject, itemid) {
    const ednotes = thisObject.getEdnotesForItemId(itemid)
    const noteToEdit = thisObject.getLatestNoteForItemAndAuthor(itemid,
                    thisObject.editorId)
    if ($.isEmptyObject(noteToEdit) && ednotes.length > 0 || ednotes.length > 1) {
      let ednotesHtml = '<h3>Other notes</h3>'
      for (const note of ednotes) {
        if (note.id === noteToEdit.id) {
          continue
        }
        ednotesHtml += '<blockquote><p>' + note.text + '</p>'
        ednotesHtml += '<footer>' +
                    thisObject.people[note.authorId].fullname +
                    ' @ ' +
                    note.time + '</footer>'
        ednotesHtml += '</blockquote>'
      }
      $('#item-modal-ednotes-' + thisObject.id).html(ednotesHtml)
    } else {
      $('#item-modal-ednotes-' + thisObject.id).html('')
    }
    if (!$.isEmptyObject(noteToEdit)) {
      $('#item-note-' + thisObject.id).val(noteToEdit.text)
      $('#item-note-id-' + thisObject.id).val(noteToEdit.id)
      $('#item-note-time-' + thisObject.id).html(
                    'Note last edited <time datetime="' +
                    noteToEdit.time +
                    '" title="' +
                    noteToEdit.time +
                    '">' +
                    TranscriptionEditor.timeSince(noteToEdit.time) +
                    ' ago</time>'
                )
    } else {
      $('#item-note-' + thisObject.id).val('')
      $('#item-note-time-' + thisObject.id).html('New note')
      $('#item-note-id-' + thisObject.id).val('new')
    }
  }
  
  static timeSince (dateString) {
    const date = Date.parse(dateString)

    const seconds = Math.floor((new Date() - date) / 1000)
    let interval = seconds / 31536000

    if (interval > 1) {
      return interval.toFixed(1) + ' years'
    }
    interval = seconds / 2592000
    if (interval > 1) {
      return interval.toFixed(1) + ' months'
    }
    interval = seconds / 86400
    if (interval > 1) {
      return interval.toFixed(1) + ' days'
    }
    interval = seconds / 3600
    if (interval > 1) {
      return interval.toFixed(1) + ' hours'
    }
    interval = seconds / 60
    if (interval > 1) {
      const minutes = Math.floor(interval)
      if (minutes === 1) {
        return '1 minute'
      }
      return minutes + ' minutes'
    }
    const secs = Math.floor(seconds)
    if (secs === 1) {
      return '1 second'
    }
    return secs + ' seconds'
  }

  
  static selectionHasFormat (quillObject, range) {
    if (range.length < 1) {
      return false
    }
    const delta = quillObject.getContents(range.index, range.length)
    for (const op of delta.ops) {
      if (op.insert === undefined) {
        continue
      }
      for (const imageBlot of TranscriptionEditor.imageBlots) {
        if (op.insert[imageBlot.name] !== undefined) {
          //console.log('Found mark: ' + type)
          return true
        }
      }
    }
    for (let i = range.index; i < range.index + range.length; i++) {
      const format = quillObject.getFormat(i, 1)
      if ($.isEmptyObject(format)) {
        continue
      }
      if (TranscriptionEditor.formatHasItem(format)) {
        return true
      }
    }
    return false
  }

  static formatHasItem (format) {
    for (const type of ['rubric', 'gliph', 'initial', 'sic', 'abbr', 'deletion', 'addition', 'unclear', 'nowb', 'mathtext']) {
      if (type in format) {
        return type
      }
    }
    return false
  }
  
  static setOnLoadCallback(node, name, value)
  {
    const editorObject = TranscriptionEditor.editorsById[value.editorid]
    $(node).on('load', function() {
      console.log('Image loaded')
      editorObject.numberLines()
    })
  }
  
  static setUpPopover (node, title, text, editorid, itemid, noText = false) {
    $(node).popover({
      content: function () {
        const editorObject = TranscriptionEditor.editorsById[editorid]
        const ednotes = editorObject.getEdnotesForItemId(itemid)
        let t = '<h3 class="editor-popover-title">' + title + '</h3>'
        if (!noText) {
          t += '<b>Text</b>: ' + node.textContent + '<br/>'
        }
        t += text
        let ednotesHtml = '<h4>Notes:</h4>'
        if ($.isEmptyObject(ednotes)) {
          ednotesHtml += '&nbsp;&nbsp;<i>None</i>'
        }
        for (const note of ednotes) {
          ednotesHtml += '<blockquote><p>' + note.text + '</p>'
          ednotesHtml += '<footer>' +
                        editorObject.people[note.authorId].fullname +
                        ' @ ' +
                        note.time + '</footer>'
          ednotesHtml += '</blockquote>'
        }
        return t + ednotesHtml
      },
      container: 'body',
      animation: false,
      template: '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-content"></div></div>', 
      delay: { 'show': 1500, 'hide': 0},
      html: true,
      placement: 'auto',
      trigger: 'hover'})
  }

  getEdnotesForItemId (itemId) {
    if (typeof itemId === 'string') {
      itemId = parseInt(itemId)
    }
    const ednotes = []
    for (const note of this.edNotes) {
      if (note.type === 2 && note.target === itemId) {
        ednotes.push(note)
      }
    }
    return ednotes
  }
  
   getLatestNoteForItemAndAuthor (itemId, authorId) {
    if (typeof itemId === 'string') {
      itemId = parseInt(itemId)
    }
    let latestTime = ''
    let latestNote = {}
    for (const note of this.edNotes) {
      if (note.type === 2 && note.target === itemId &&
                    note.authorId === authorId &&
                    note.time > latestTime) {
        latestTime = note.time
        latestNote = note
      }
    }
    return latestNote
  }

  static getMySqlDate (d) {
    return d.getFullYear() + '-' +
            ('00' + (d.getMonth() + 1)).slice(-2) + '-' +
            ('00' + d.getDate()).slice(-2) + ' ' +
            ('00' + d.getHours()).slice(-2) + ':' +
            ('00' + d.getMinutes()).slice(-2) + ':' +
            ('00' + d.getSeconds()).slice(-2)
  }

  
  static removeFormat (quillObject, range) {
    for (let i = range.index; i < range.index + range.length; i++) {
      const format = quillObject.getFormat(i, 1)
      if ($.isEmptyObject(format)) {
        continue
      }
      const lang = format.lang
      let elementType = ''
      for (const blockBlot of TranscriptionEditor.blockBlots) {
        if (blockBlot.name in format) {
          elementType = blockBlot.name
          break
        }
      }
      quillObject.removeFormat(i, 1)
      quillObject.formatText(i, 1, 'lang', lang)
      if (elementType !== '') {
        quillObject.formatLine(i, 1, elementType, true)
      }
    }
    quillObject.setSelection(range.index + range.length)
  }
  
  static rangeIsInMidItem (quillObject, range) {
 
    const prevFormat = quillObject.getFormat(range.index, 0)
    const nextFormat = quillObject.getFormat(range.index + range.length + 1, 0)
    const prevItem = TranscriptionEditor.formatHasItem(prevFormat)
    const nextItem = TranscriptionEditor.formatHasItem(nextFormat)
    if (prevItem === nextItem) {
      if (prevItem === false) {
        return false
      }
      return true
    }
    return false
  }
  
  static indexIsInNormalLine(quillObject, index) {
    let [line,] = quillObject.getLine(index)
    if (line instanceof SimpleBlockBlot) {
      return false
    }
    return true
  }
  
  
  static resetItemModal (id) {
    $('#item-modal-title-' + id).html('')
    $('#item-modal-text-fg-' + id).hide()
    $('#item-modal-alttext-fg-' + id).hide()
    $('#item-modal-extrainfo-fg-' + id).hide()
    $('#item-modal-length-fg-' + id).hide()
    $('#item-modal-target-fg-' + id).hide()
    $('#item-modal-hand-fg-' + id).hide()
    $('#item-modal-ednote-fg-' + id).show()
    $('#item-modal-ednotes-' + id).html('')
    $('#item-note-' + id).val('')
    $('#item-note-time-' + id).html('New note')
    $('#item-note-id-' + id).val('new')
    $('#item-modal-submit-button-' + id).off()
  }
  
  static registerEvent(eventName)
  {
    if (TranscriptionEditor.events === undefined) {
      TranscriptionEditor.events = []
    }
    TranscriptionEditor.events.push(eventName)
  }

  static registerEditorInstance(id, editorObject) 
  {
    if (TranscriptionEditor.editors === undefined) {
      TranscriptionEditor.editors = []
    }
    if (TranscriptionEditor.editorsById === undefined) {
      TranscriptionEditor.editorsById = []
    }
    TranscriptionEditor.editors.push(editorObject)
    TranscriptionEditor.editorsById[id] = editorObject
  }
  static registerBlockBlot(theBlot, options)
  {
    if (TranscriptionEditor.blockBlots === undefined) {
      TranscriptionEditor.blockBlots = []
    }
    theBlot.blotName = options.name
    theBlot.title = options.title
    if (options.className === undefined) {
      options.className = options.name
    }
    theBlot.className = options.className
    if (options.place) {
      theBlot.place = options.place
    }
    TranscriptionEditor.blockBlots.push(options)
    Quill.register(theBlot)
  }
  
  static registerFormatBlot(theBlot, options)
  {
    if (TranscriptionEditor.formatBlots === undefined) {
      TranscriptionEditor.formatBlots = []
    }
    theBlot.blotName = options.name
    if (options.className === undefined) {
      options.className = options.name
    }
    theBlot.className = options.className
    theBlot.title = options.title
    if (options.alttext) {
      theBlot.alttext = options.alttext
    }
    if (options.extrainfo) {
      theBlot.extrainfo = options.extrainfo
    }
    if (options.target) {
      theBlot.target = options.target
    }
    
    TranscriptionEditor.formatBlots.push(options)
    Quill.register(theBlot)
  }
  
  static registerSpecialCharacter(character, options) 
  {
    if (TranscriptionEditor.specialCharacters === undefined) {
      TranscriptionEditor.specialCharacters = []
    }
    
    if (options === undefined) {
      options = {}
    }
    if (options.icon === undefined) {
      options.icon = character
    }
    
    if (options.title === undefined) {
      options.title = 'Insert ' + character
    }
    
    if (options.name === undefined) {
      options.name = 'char' + character.charCodeAt(0)
    }
    
    options.character = character
    TranscriptionEditor.specialCharacters.push(options)
    
  }
  static registerImageBlot(theBlot, options)
  {
    if (TranscriptionEditor.imageBlots === undefined) {
      TranscriptionEditor.imageBlots = []
    }
    theBlot.blotName = options.name
    if (options.className === undefined) {
      options.className = options.name
    }
    if (options.imageAlt === undefined) {
      options.imageAlt = options.name
    }
    if (options.withPopover === undefined) {
      options.withPopover = false
    }
    if (options.renumberLinesOnImageLoad === undefined) {
      options.renumberLinesOnImageLoad= false
    }
    if (options.getImageUrl === undefined) {
      options.getImageUrl = function () { return 'urlnotset'}
    }
    theBlot.className = options.className
    theBlot.title = options.title
    theBlot.imageAlt = options.imageAlt
    theBlot.withPopover = options.withPopover
    theBlot.renumberLinesOnImageLoad = options.renumberLinesOnImageLoad
    theBlot.getImageUrl = options.getImageUrl
    
    if (options.text) {
      theBlot.text = options.text
    }
    if (options.alttext) {
      theBlot.alttext = options.alttext
    }
    if (options.extrainfo) {
      theBlot.extrainfo = options.extrainfo
    }
    if (options.target) {
      theBlot.target = options.target
    }
    if (options.thelength) {
      theBlot.thelength = options.thelength
    }

    options.jsClass = theBlot
    TranscriptionEditor.imageBlots.push(options)
    Quill.register(theBlot)
  }
  
  static init(baseUrl)
  {

    TranscriptionEditor.baseUrl = baseUrl
    TranscriptionEditor.registerEvent('editor-enable')
    TranscriptionEditor.registerEvent('editor-disable')
    TranscriptionEditor.registerEvent('editor-save')
    TranscriptionEditor.registerEvent('editor-reset')
    TranscriptionEditor.editorTemplate = Twig.twig({
      id: 'editor',
      data: `
<div class="transcription-editor">
  {#  TOP TOOLBAR #}  
  <div id="editor-controls-{{id}}" class="editor-controlbar">
      <button id="zoom-in-button-{{id}}" title="Make text bigger"><i class="fa fa-search-plus"></i></button>
      <button id="zoom-out-button-{{id}}" title="Make text smaller"><i class="fa fa-search-minus"></i></button>
      <button id="toggle-button-{{id}}" title="Edit"><i class="fa fa-pencil"></i></button>
      <button id="save-button-{{id}}" title="Save changes"><i class="fa fa-save"></i></button>
      <button id="reset-button-{{id}}" title="Revert to last saved changes"><i class="fa fa-refresh"></i></button>
  </div>
      
  {#  BOTTOM TOOLBAR #}
  <div class="toolbar" id="toolbar-{{id}}">
      
    {# Clear and Edit #}
    <button id="clear-button-{{id}}" class="selFmtBtn" title="Clear formatting" disabled><i class="fa fa-eraser"></i></button>
    <button id="edit-button-{{id}}" class="selFmtBtn" title="Edit" disabled><i class="fa fa-pencil"></i></button>
    <span class="separator"/>

    {# Languages #}
    <span id="langButtons-{{id}}"></span>
    <span class="separator"/>

    {# Simple Format Buttons #}
    <span id="simpleFormatButtons-{{id}}"></span>
    <span class="separator"/>
      
    {# Simple Image Buttons #}
    <span id="simpleImageButtons-{{id}}"></span>
    <button id="chunk-start-button-{{id}}" class="imgFmtBtn chunkButton"  title="Chunk Start">{</button>
    <button id="chunk-end-button-{{id}}" class="imgFmtBtn chunkButton"  title="Chunk End">}</button>
    <span class="separator"/>
      
    {# Special characters #}
    <span id="specialCharacterButtons-{{id}}"></span>
    <span class="separator"/>

    {# Editorial Note #}
    <button id="note-button-{{id}}" title="Editorial Note"><i class="fa fa-comment-o"></i></button>
    <span class="separator"/>
      
    {#Elements#}
    <button id="line-button-{{id}}" title="Line">L</button>
    <span id="simpleBlockButtons-{{id}}"></span>
    <span class="separator"/>
    {# OTHER #}
    <button id="linegap-button-{{id}}" class="imgFmtBtn lineGapButton" title="Line Gap">Gap</button>
    <span class="separator"/>

    {# Default Language #}
    <button class="title-button" disabled>Default:</button>
    <span class="dropdown">
        <button class="dropdown-toggle" type="button" id="lang-button-{{id}}" title="Latin" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
            la
       </button>
        <ul class="dropdown-menu" id="set-lang-dd-menu-{{id}}" aria-labelledby="lang-button-{{id}}">
       </ul>
    </span>
    <span class="separator"/>
      


    <span class="separator"/>
</div>
<div id="editor-container-{{id}}" class="editor-container"></div>
<div id="status-bar-{{id}}" class="editor-statusbar"></div>
</div>
<div id="cbtmp" style="display: none;">
</div>
`
    })
    TranscriptionEditor.modalsTemplate = Twig.twig({
      id: 'editor-modals',
      data:`
<!-- ITEM modal {{id}} -->            
<div id="item-modal-{{id}}" class="modal" role="dialog">
    <div class="modal-dialog modal-sm" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 id="item-modal-title-{{id}}" class="modal-title"></h4>
            </div>
            <div class="modal-body" id="item-modal-body-{{id}}">
                <form>
                    <div id="item-modal-text-fg-{{id}}" class="form-group">
                        <label for="item-modal-text-{{id}}" class="control-label">Text:</label>
                        <span id="item-modal-text-{{id}}"></span>
                    </div>
                    <div id="item-modal-alttext-fg-{{id}}" class="form-group">
                        <label for="item-modal-alttext-{{id}}" id="item-modal-alttext-label-{{id}}" class="control-label">Alt Text:</label>
                        <input type="text" class="form-control" id="item-modal-alttext-{{id}}">
                    </div>
                    <div id="item-modal-extrainfo-fg-{{id}}" class="form-group">
                        <label for="item-modal-extrainfo-{{id}}" id="item-modal-extrainfo-label-{{id}}" class="control-label">Extra Info:</label>
                        <select name="extrainfo" id="item-modal-extrainfo-{{id}}"></select>
                    </div>
                    <div id="item-modal-length-fg-{{id}}" class="form-group">
                        <label for="item-modal-length-{{id}}" id="item-modal-length-label-{{id}}" class="control-label">Length:</label>
                        <input type="number" name="length" class="form-control" id="item-modal-length-{{id}}"></input>
                    </div>
                    <div id="item-modal-target-fg-{{id}}" class="form-group">
                        <label for="item-modal-target-{{id}}" id="item-modal-target-label-{{id}}" class="control-label">Extra Info:</label>
                        <select name="target" id="item-modal-target-{{id}}"></select>
                    </div>
                    <div id="item-modal-hand-fg-{{id}}" class="form-group">
                        <label for="item-modal-hand-{{id}}" id="item-modal-hand-label-{{id}}" class="control-label">Hand:</label>
                        <select name="hand" id="item-modal-hand-{{id}}"></select>
                    </div>
      
                    <input id="item-note-id-{{id}}" type="hidden" name="note-id" value=""/>
                    <div class="form-group" id="item-modal-ednote-fg-{{id}}">
                        <label for="item-note-{{id}}" class="control-label">Note:</label>
                        <textarea rows="4" class="form-control" id="item-note-{{id}}"></textarea>
                        <p class="item-note-edit-time" id="item-note-time-{{id}}"></p>
                    </div>
                    <div class="modal-ednotes" id="item-modal-ednotes-{{id}}">
                    </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" id="item-modal-cancel-button-{{id}}" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="item-modal-submit-button-{{id}}">Submit</button>
            </div>
        </div>
    </div>
</div>
            
            
<!-- CHUNK modal {{id}} -->            
<div id="chunk-modal-{{id}}" class="modal" role="dialog">
    <div class="modal-dialog modal-sm" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 id="chunk-modal-title-{{id}}" class="modal-title">Chunk</h4>
            </div>
            <div class="modal-body" id="chunk-modal-body-{{id}}">
                <form class="form-horizontal">
                    <div id="chunk-modal-worknumber-fg-{{id}}" class="form-group">
                        <label for="chunk-modal-worknumber-{{id}}" class="control-label">Work Number:</label>
                        <input type="number" name="worknumber" class="form-control" id="chunk-modal-worknumber-{{id}}"></input>
                    </div>
                    <div id="chunk-modal-chunknumber-fg-{{id}}" class="form-group">
                        <label for="chunk-modal-chunknumber-{{id}}" id="chunk-modal-chunknumber-label-{{id}}" class="control-label">Chunk:</label>
                        <input type="number" name="chunk" class="form-control" id="chunk-modal-chunknumber-{{id}}"></input>
                    </div>
                    <input id="chunk-note-id-{{id}}" type="hidden" name="note-id" value=""/>
                    <div class="form-group">
                        <label for="chunk-note-{{id}}" class="control-label">Note:</label>
                        <input type="text" class="form-control" id="chunk-note-{{id}}">
                        <p class="chunk-note-edit-time" id="chunk-note-time-{{id}}"></p>
                    </div>
                    <div class="modal-ednotes" id="chunk-modal-ednotes-{{id}}">
                    </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" id="chunk-modal-cancel-button-{{id}}" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="chunk-modal-submit-button-{{id}}">Submit</button>
            </div>
        </div>
    </div>
</div>            
            
<!-- ALERT modal {{id}} -->             
<div id="alert-modal-{{id}}" class="modal" role="dialog">
    <div class="modal-dialog modal-sm " role="document">
        <div class="modal-content bg-info">
            <div class="modal-header">
                <h4 id="alert-modal-title-{{id}}">Please confirm</h4>
            </div>
            <div class="modal-body" id="alert-modal-body-{{id}}">
                <p id="alert-modal-text-{{id}}"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="alert-modal-cancel-button-{{id}}" data-dismiss="modal">No</button>
                <button type="button" class="btn btn-danger" id="alert-modal-submit-button-{{id}}">Yes</button>
            </div>
</div>      
`
    })
  }
}
