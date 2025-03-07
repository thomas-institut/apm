/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */


import Quill from 'quill/core'
import { SimpleBlockBlot } from './TranscriptionEditorBlots'
import { EditorData } from './EditorData'
import { configureTranscriptionEditorBlots } from './TranscriptionEditorBlotConfig'
import * as Entity from '../../constants/Entity'
import { getLangCodeFromLangId, getLangIdFromLangCode } from '../../constants/TranscriptionLanguages'



const validAppellations = {
  la: [
    'Canon',
    'Capitulum',
    'Commentum',
    'Differentia',
    'Divisio',
    'Liber',
    'Pars',
    'Summa',
    'Textus'
  ],
  he: [
    'באור',
    'חלק',
    'כלל',
    'מאמר',
    'ספר',
    'פרוש',
    'פרק'
  ],
  ar: [
    'كتاب',
    'تفسير',
    'جزء',
    'جملة',
    'شرح',
    'فصل',
    'قسم',
    'قول',
    'لفظ',
    'مقالة'
  ],
  jrb: [
    'كتاب',
    'تفسير',
    'جزء',
    'جملة',
    'شرح',
    'فصل',
    'قسم',
    'قول',
    'لفظ',
    'مقالة'
  ]
}

/**
 * 
 * Implementation of the transcription editor
 */
export class TranscriptionEditor
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
    console.log('Transcription editor options')
    console.log(this.options)
    this.people = this.options.people
    this.editorTid = this.options.editorTid
    this.activeWorks = this.options.activeWorks
    this.lastSelectedWorkId = this.activeWorks[0].dareId
    this.chunkNumberEntered = 1
    this.containerElement = $('#' + this.options.containerId)
    // Default hand id is always 0!
    this.handId = 0
    this.minItemId = 0
    this.minNoteId = 0
    
    let containerSelector = '#' + containerId
    const editorHtml = TranscriptionEditor.editorTemplate.render({id: id})
    $(containerSelector).html(editorHtml)
    const modalsHtml = TranscriptionEditor.modalsTemplate.render({id: id})
    $('body').append(modalsHtml)
    
    this.quillObject = new Quill('#editor-container-' + this.id, {})
    this.setDefaultLang(this.options.defaultLang);
    this.setFontSize(this.options.langDef[this.defaultLangId].fontsize)
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
    this.quillObject.clipboard.addMatcher('B', (node, delta)=> {
      console.log(`Pasting bold text`);
      console.log(delta);
      return { ops: [  {
        insert: delta.ops[0].insert,
          attributes: {
           boldtext: {
             handid: 0,
             editorid: this.id ,
             itemid: this.getOneItemId()
           }
          }

      }
        ]};
    });
    
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
    langDef.forEach( (langDefEntry) => {
      // language button
      let buttonId = `${langDefEntry['code']}-button-${this.id}`;
      $('#langButtons-'+this.id).append(
        `<button id="${buttonId}" class="langButton" title="${langDefEntry['name']}" disabled>${langDefEntry['code']}</button>`
      )
      $(`#${buttonId}`).on('click', this.genOnClickLangButton(langDefEntry))
      // option in default language menu
      let optionId = 'set-' +langDefEntry['code'] + '-' + this.id
      $('#set-lang-dd-menu-' + id).append('<a class="dropdown-item" href="#" id="'+ optionId +'">'
        + langDefEntry['name'] + '</a>')
      $('#' + optionId).on('click', this.genOnClickSetLang(langDefEntry['id']))
    });

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
        dropdownHtml += '<div class="dropdown dropdown-button">'
        dropdownHtml +=
            '<button id="' + buttonId +  '" ' + 
            'class="selFmtBtn" ' +
            'title="' + formatBlot.title + '" ' +
            'disabled data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"' +
            '>' + 
            formatBlot.icon + '</button>'
        dropdownHtml += '<div class="dropdown-menu" aria-labelledby="'  +
          buttonId + '">'
        dropdownHtml += '<h6 class="dropdown-header">' +optionsField.title + '</h6>'
        dropdownHtml += '<div class="dropdown-divider"></div>'
        let optionNumber = 1
        for (const option of optionsField.options ) {
          let optionId = buttonId + '-' + optionNumber
          dropdownHtml += '<a class="dropdown-item" href="#" id="' + optionId + '">' + option + '</a>'
          optionNumber++
        }
        dropdownHtml += '</div></div>'
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
    $('#chunk-start-button-' + id).on('click',
            this.genChunkButtonFunction('start'))
    $('#chunk-end-button-' + id).on('click',
            this.genChunkButtonFunction('end'))
    $('#chapter-start-button-' + id).on('click',
      this.genChapterMarkButtonFunction('start'))
    $('#chapter-end-button-' + id).on('click',
      this.genChapterMarkButtonFunction('end'))
    
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
          dropdownHtml += '<div class="dropdown dropdown-button">'
          dropdownHtml +=
              '<button id="' + buttonId +  '" ' + 
              'title="' + blockBot.title + '"' + 
              ' data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"' +
              '>' + 
              blockBot.icon + '</button>'
          dropdownHtml += '<div class="dropdown-menu" aria-labelledby="'  +
            buttonId + '">'
          dropdownHtml += '<h6 class="dropdown-header">' +optionsField.title + '</h6>'
          dropdownHtml += '<div class="dropdown-divider"></div>'
          let optionNumber = 1
          for (const option of optionsField.options ) {
            let optionId = buttonId + '-' + optionNumber
            dropdownHtml += '<a class="dropdown-item"  href="#" id="' + optionId + '">' + option + '</a>'
            optionNumber++
          }
          dropdownHtml += '</div></div'
          $('#simpleBlockButtons-'+this.id).append(dropdownHtml)
          optionNumber = 1
          for (const option of optionsField.options ) {
            let value = {}
            value[optionsFieldName] = option
            $('#'+buttonId + '-' + optionNumber).on('click', 
              this.genOnClickSimpleBlockButton(blockBot, value))
            optionNumber++
          }

        } else {
          $('#simpleBlockButtons-'+this.id).append(
                  '<button id="' + buttonId +  '" ' + 
                  'title="' + blockBot.title + '">' + 
                  blockBot.icon + '</button>'
            )
          $('#'+buttonId).on('click', this.genOnClickSimpleBlockButton(blockBot))
        }
      }
    }
    
    // Special image blocks
    
    $('#linegap-button-' + id).on('click', this.genOnClickLineGapButton())

    // enable/disable
    // if (this.options.startEnabled) {
    //   this.enable()
    // }
    // else {
    //   this.disable()
    // }

    this.disable()
    // generate number lines when all elements are done
    
    //console.log('Number lines on TE constructor')
    this.numberLines()
    
    TranscriptionEditor.registerEditorInstance(this.id, this)
  }

  /**
   * Generates a full options object from a user options object
   * It fills the options objects with appropriate defaults for 
   * parameters not specified by the user.
   * 
   * @param {object} userOptions
   */
  static getOptions(userOptions) {
    let options = userOptions
    if (options === false) {
      options = {}
    }

    if (options.activeWorks === undefined) {
      options.activeWorks = []
      options.activeWorks.push({
        title: "Averroes - Stub Work",
        dareId: 'AW01',
        maxChunk: 125
      })
    }
    
    
    if (options.people === undefined) {
      options.people = []
      options.people[0] = { name: 'No editor' }
      options.people[1] = { name: 'Editor 1'}
    }
    // editorId: int
    // the id of the transcriber
    if (options.editorTid === undefined) {
      options.editorTid = 1 //
    }
    
    // startEnabled:  true/false
    // if (options.startEnabled === undefined) {
    //   options.startEnabled = false
    // }

    // langDef : language definitions
    if (options.langDef === undefined) {
      options.langDef[Entity.LangLatin] = { id: Entity.LangLatin, name: 'Latin', code: 'la', fontsize: 3, rtl: false};
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
    
  setDefaultLang(langCode)
  {

    let langDef = this.options.langDef
    console.log(`Setting default lang ${langCode}`);
    let theLangId = getLangIdFromLangCode(langCode);

    if (theLangId=== -1) {
      console.warn('Invalid default language: ' + langCode)
      return false
    }
    let editorContainer = $('#editor-container-container-' + this.id);

    langDef.forEach( (langDefEntry, langId) => {
      if (langId === theLangId) {
        editorContainer.addClass(langDefEntry['code'] + '-text')
      } else {
        editorContainer.removeClass(langDefEntry['code'] + '-text')
      }
    });

    $('#lang-button-' + this.id)
      .attr('title', langDef[theLangId].name)
      .html(langDef[theLangId].code)
    this.defaultLang = langCode;
    this.defaultLangId = theLangId;
    this.setEditorMargin();
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
    let marginSize = this.getEditorMarginSize();
    let qlEditor = $('#editor-container-' + this.id + ' .ql-editor');
    if (this.options.langDef[this.defaultLangId].rtl) {
      qlEditor.css('margin-left', '0')
        .css('margin-right', marginSize + 'px')
        .css('border-right', 'solid 1px #e0e0e0')
        .css('border-left', 'none')
      return true
    }
    qlEditor.css('margin-right', '0')
      .css('margin-left', marginSize + 'px')
      .css('border-left', 'solid 1px #e0e0e0')
      .css('border-right', 'none')
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
  
  measureText(text, className, fontSizeInEms=1) {
    let measuringDiv = document.getElementById('text-measurement-'+this.id)
    $(measuringDiv).addClass(className)
    measuringDiv.style.fontSize= fontSizeInEms + 'em'
    $(measuringDiv).html(text)
    let measurement = { width: measuringDiv.clientWidth+1, height: measuringDiv.clientHeight+1}
    $(measuringDiv).removeClass(className)
    return measurement
  }

  numberLines()
  {
    let pElements = $('#' + this.containerId + ' ' + '.ql-editor > p')
    //console.log('Numbering lines in editor ' + this.id + ', ' + pElements.length + ' elements')
    let editorDiv = $('#' + this.containerId + ' ' + '.ql-editor')
    let overlaysContainer = $('#editor-container-container-' + this.id)
    let editorContainerLeftPos = $(editorDiv).position().left
    let marginSize = this.getEditorMarginSize()
    let lineNumber = 0
    let overlayNumber = 0
    let inMarginal = false
    let lastMarginalId = -1
    let numChars = this.options.lineNumbers.numChars;
    let lastMarginalP = undefined
    let firstP = $(pElements[0])
    let firstPTopOffset = firstP.position().top
    //console.log('Top offset: ' + firstPTopOffset)
    for (const p of pElements) {
      let theP = $(p)
      let lineNumberLabel = '-'
      let topLabelText = ''
      let place = null
      let elementId = null
      let target = null
      let targetText = null
      switch (this.getParagraphType(theP)) {
        case 'normal':
          inMarginal = false
          let foundLineGap = false
          let theLineGap = undefined
          let children = theP.children()
          if (children.length === 1) {
            let theChild = $(children[0])
            if (theChild.hasClass('linegap')) {
              foundLineGap = true
              theLineGap = theChild
            } else {
              if (theChild.children.length > 0) {
                let theGrandChildren = theChild.children()
                let theGrandChild = $(theGrandChildren[0])
                if (theGrandChild.hasClass('linegap')) {
                  foundLineGap = true
                  theLineGap = theGrandChild
                }
              }
            }
          }
          if(foundLineGap) {
            lineNumber += parseInt(theLineGap.attr('length'))
            lineNumberLabel = ''
            break
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
          place = theP.attr('place')
          elementId = theP.attr('elementid')
          lastMarginalP = theP
          if (!inMarginal || elementId !== lastMarginalId) {
            // first line of marginal
            lastMarginalId = elementId
            theP.addClass('firstmarginalline')
            lineNumberLabel = '<a title="Gloss">&nbsp;G</a>'
            topLabelText = 'Gloss @ ' + place
          } else {
            theP.removeClass('firstmarginalline')
            lineNumberLabel = '&nbsp;-'
          }
          inMarginal = true
          break
        
        case 'additionelement':
          place = theP.attr('place')
          elementId = theP.attr('elementid')
          target = theP.attr('target')
          targetText = theP.attr('targettext')
          lastMarginalP = theP
          if (!inMarginal || elementId !== lastMarginalId) {
            // first line of marginal
            lastMarginalId = elementId
            theP.addClass('firstmarginalline')
            let title = 'Addition @ ' + place 
            if (targetText !== '[none]') {
              title += ', replaces ' + targetText
            }
            lineNumberLabel = '<a title="Addition">&nbsp;A</a>'
            topLabelText = title
          } else {
            theP.removeClass('firstmarginalline')
            lineNumberLabel = '&nbsp;-'
          }
          inMarginal = true
          break
          
          case 'substelement':
          place = theP.attr('place')
          elementId = theP.attr('elementid')
          target = theP.attr('target')
          targetText = theP.attr('targettext')
          lastMarginalP = theP
          if (!inMarginal || elementId !== lastMarginalId) {
            // first line of marginal
            lastMarginalId = elementId
            theP.addClass('firstmarginalline')
            let title = 'Addition @ ' + place 
            if (targetText !== '[none]') {
              title += '  ' + targetText
            } else {
              title += ' (!) NO TARGET'
            }
            lineNumberLabel = '<a title="Marginal Substitution">&nbsp;A</a>'
            topLabelText = title
          } else {
            theP.removeClass('firstmarginalline')
            lineNumberLabel = '&nbsp;-'
          }
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
              + parseInt(theP.css('marginTop'))
              - firstPTopOffset
              + 3
      let fontEmSize = this.calcEditorFontEmSize(this.fontSize)*fontFactor
      let fontCharWidth = fontEmSize*this.options.pixPerEm*this.options.lineNumbers.charWidth
      let numberMargin = this.options.lineNumbers.margin;
      
       let lineNumberLeftPos = marginSize - numberMargin - numChars*fontCharWidth;
      if (this.defaultLang !== 'la') {
        lineNumberLeftPos = $(editorDiv).outerWidth() + numberMargin;
      }
      let overlay = ''
      overlayNumber++
      let overlayId = this.containerId + '-ovr-' + overlayNumber
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
      overlaysContainer.append(overlay)
      if (topLabelText !== '') {
        overlayNumber++
        overlayId = this.containerId + '-ovr-' + overlayNumber
        let topLabelTopPos = offset.top 
              + parseInt(theP.css('marginTop'))
              - this.options.editorLineHeight*editorFontSize*0.8
              - firstPTopOffset
        
        let topLabelLeft = marginSize + 40;
        let topLabelWidth = this.measureText(topLabelText, 'linenumber', fontEmSize).width
        if (this.defaultLang !== 'la') {
           topLabelLeft = $(editorDiv).outerWidth() - numberMargin - topLabelWidth - 40;
        }
        overlay = '<div class="linenumber" id="' +
        overlayId +
        '" style="position: absolute;' + 
        'direction: ltr;' +
        //'border: 1px solid black;' +
        'top:' +  topLabelTopPos + 'px; ' + 
        'left: ' + topLabelLeft + 'px; ' + 
        'line-height: ' + this.options.editorLineHeight*editorFontSize + 'px;' +
        'font-size:' + fontEmSize + 'em; ' +
        'width: ' +  topLabelWidth  + 'px;' +
        'height: ' + this.options.editorLineHeight*editorFontSize + 'px;' +  
        '">' +
        topLabelText +
        '</div>'
        $('#' + overlayId).remove()
        overlaysContainer.append(overlay)
      }

    }
    if (this.numOverlays > overlayNumber) {
      for (let i = overlayNumber + 1; i <= this.numOverlays; i++) {
        let overlayId = this.containerId + '-ovr-' + i
        $('#' + overlayId).remove()
      }
    }
    this.numOverlays = overlayNumber

  }
  
  dispatchEvent(eventName, data = {})
  {
    const event = new CustomEvent(eventName, {detail : data})
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
    let thisObject = this
    if (!this.isCurrentVersionLatest()) {
      console.warn('Editing older version')
      $('#alert-modal-title-' + this.id).html('About to edit an older version!')
      $('#alert-modal-text-' + this.id).html(
        '<p>The editor is showing an older version of this transcription</p>' +
        '<p>Your changes will become the latest version when you save!</p>' +
        '<p class="text-danger"> Are you sure you want to edit this?</p>')
      $('#alert-modal-submit-button-' + thisObject.id).html('Yes!')
      $('#alert-modal-cancel-button-' + thisObject.id).html('No')
      $('#alert-modal-submit-button-' + this.id).off().on('click', function () {
        //console.log("User wants to drop changes in editor")
        $('#alert-modal-' + thisObject.id).modal('hide')
        thisObject.setVersionTitleButton(thisObject.currentVersion, false)
        // if (typeof(thisObject.versions[thisObject.currentVersion]) !== "undefined" ) {
        //   thisObject.setVersionTitleButtonRaw(thisObject.versions[thisObject.currentVersion].buttonHtml, false)
        // }

        thisObject.enabled = true
        $('#toolbar-'+ thisObject.id).show()
        thisObject.quillObject.enable(thisObject.enabled)
        $('#save-button-' + thisObject.id).prop('disabled', true).show();
        $('#reset-button-' + thisObject.id).prop('disabled', true).show();
        $('#toggle-button-' + thisObject.id).prop('title', 'Leave editor')
          .html('<i class="fas fa-power-off"></i>')
        thisObject.lastSavedData = thisObject.quillObject.getContents()
        thisObject.setContentsNotChanged()
        thisObject.quillObject.setSelection(thisObject.quillObject.getLength())
        thisObject.resizeContainer()
        thisObject.dispatchEvent('editor-enable')
      })
      $('#alert-modal-' + this.id).modal('show')
      return true
    }
   // disable dropdown if there are versions
   // if (typeof(this.versions[this.currentVersion]) !== "undefined" ) {
   //   this.setVersionTitleButtonRaw(this.versions[this.currentVersion].buttonHtml, false)
   // }
    this.setVersionTitleButton(this.currentVersion, false)

    this.enabled = true
    $('#toolbar-'+ this.id).show()
    this.quillObject.enable(this.enabled)
    $('#save-button-' + this.id).prop('disabled', true).show();
    $('#reset-button-' + this.id).prop('disabled', true).show();
    $('#toggle-button-' + this.id).prop('title', 'Leave editor')
      .html('<i class="fas fa-power-off"></i>');
    this.lastSavedData = this.quillObject.getContents()
    this.setContentsNotChanged()
    this.quillObject.setSelection(this.quillObject.getLength())
    this.resizeContainer()
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
      $('#alert-modal-cancel-button-' + thisObject.id).html('Cancel')
      $('#alert-modal-submit-button-' + this.id).html('Yes, leave!')
        .off()
        .on('click', function () {
          console.log("User wants to drop changes in editor")
          $('#alert-modal-' + thisObject.id).modal('hide')

          thisObject.enabled = false
          $('#toolbar-' + thisObject.id).hide()
          $('#save-button-' + thisObject.id).hide()
          $('#reset-button-' + thisObject.id).hide()
          $('#toggle-button-' + thisObject.id).prop('title', 'Edit')
            .html('<i class="fas fa-pencil-alt"></i>')
          thisObject.quillObject.setContents(thisObject.lastSavedData)
          thisObject.quillObject.enable(thisObject.enabled)
          thisObject.setContentsNotChanged()
          // if (typeof(thisObject.versions[thisObject.currentVersion]) !== "undefined" ) {
          //   thisObject.setVersionTitleButtonRaw(thisObject.versions[thisObject.currentVersion].buttonHtml, true)
          // }
          thisObject.setVersionTitleButton(thisObject.currentVersion, true)
          thisObject.resizeContainer()
          //console.object("Number lines on disable, after dialog")
          thisObject.numberLines()
          thisObject.dispatchEvent('editor-disable')
        })
      $('#alert-modal-' + this.id).modal('show')
      return true
    }
    this.enabled = false

    // allow dropdown if there are versions
    // if (typeof(this.versions[this.currentVersion]) !== "undefined" ) {
    //   this.setVersionTitleButtonRaw(this.versions[this.currentVersion].buttonHtml, true)
    // }
    this.setVersionTitleButton(this.currentVersion, true)


    $('#toolbar-' + this.id).hide();
    $('#save-button-' + this.id).hide();
    $('#reset-button-' + this.id).hide();
    $('#toggle-button-' + this.id).prop('title', 'Edit')
      .html('<i class="fas fa-pencil-alt"></i>');
    this.quillObject.enable(this.enabled)
    this.contentsChanged = false
    this.resizeContainer()
    //console.log('Number lines on disable')
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
    //this.setVersionTitleButtonRaw(this.versions[this.currentVersion].buttonHtml + ' *', false)
    this.setVersionTitleButton(this.currentVersion, false, true)
    this.contentsChanged = true
  }
  
  setContentsNotChanged() {
    $('#save-button-' + this.id).prop('disabled', true)
    $('#reset-button-' + this.id).prop('disabled', true)

    //this.setVersionTitleButtonRaw(this.versions[this.currentVersion].buttonHtml, false)
    this.setVersionTitleButton(this.currentVersion, false, false)
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
  save(versionInfo) {
    if (!this.contentsChanged) {
      // No changes, return
      return true
    }
    this.saving = true
    $('#save-button-' + this.id).prop('title', 'Saving changes...')
      .html('<i class="fas fa-spinner fa-spin fa-fw"></i>');
    this.quillObject.enable(false)
    this.dispatchEvent('editor-save', versionInfo)
  }
  
  saveSuccess(newData) {
    this.lastSavedData = newData
    this.setData(newData)
    this.setContentsNotChanged()
    this.saving = false
    $('#save-button-' + this.id).prop('title', 'Save changes')
      .html('<i class="far fa-save"></i>');
    this.quillObject.enable(true)
  }
  
  saveFail(reason) {
    this.saving = false
    $('#save-button-' + this.id).prop('title', 'Could not save: ' + reason )
      .html('<span class="fa-stack"><i class="far fa-save fa-stack-1x"></i><i class="fas fa-exclamation-triangle fa-stack-1x text-danger"></i></span>')
    this.quillObject.enable(true)
  }

  loadNewVersion(newData) {
    this.lastSavedData = newData
    this.setData(newData)
    this.setContentsNotChanged()
    //this.setVersionTitleButtonRaw(this.versions[this.currentVersion].buttonHtml, true)
    this.setVersionTitleButton(this.currentVersion, true)
  }

  reset() {
    this.quillObject.setContents(this.lastSavedData)
    $('#save-button-' + this.id).prop('title', 'Save changes')
      .html('<i class="far fa-save"></i>');
    let thisObject = this
    window.setTimeout( function() {
      //console.log('Number Lines on reset')
      thisObject.numberLines()
    }, 200)
    this.dispatchEvent('editor-reset')
  }
  
  setDisableLangButtons (disable = true) {
    console.log(`Setting the disable prop in lang buttons`, disable);
    this.options.langDef.forEach( (langDefEntry) => {
      $('#' + langDefEntry['code'] + '-button-' + this.id).prop('disabled', disable)
    })
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
      this.versions = []
      this.currentVersion = -1
      return true
    }
    console.log('Setting data in transcription editor')
    console.log(columnData)
    
    this.edNotes = columnData.ednotes
    for (const note of this.edNotes) {
      this.minNoteId = Math.min(this.minNoteId, note.id)
    }

    this.people = columnData['people'];
    this.pageId = columnData['info'].pageId;
    this.columnNumber = columnData['info'].col;
    this.pageDefaultLang = this.defaultLang;
    if (columnData['info']['lang'] !== undefined) {
      this.pageDefaultLang = getLangCodeFromLangId(columnData['info']['lang']);
    }

    //console.log(columnData)
    
    let editorData = EditorData.getTranscriptionEditorDataFromApiData(
            columnData, this.id, this.options.langDef, this.minItemId, 
            TranscriptionEditor.blockBlots,
            TranscriptionEditor.formatBlots)
  
    this.minItemId = editorData.minItemId
    this.quillObject.setContents(editorData.delta)
    this.lastSavedData = this.quillObject.getContents()
    // let mainLang = editorData.mainLang
    // if (!mainLang) {
    //   mainLang = this.pageDefaultLang
    // }
    let mainLang = this.pageDefaultLang

    this.setVersions(columnData)
    
    this.setDefaultLang(mainLang)
    
    // delay a little bit, wait for html elements to be ready 
    let thisObject = this
    window.setTimeout( function() {
      thisObject.numberLines()
    }, 50)

  }

  setVersions(columnData)
  {
    this.versions = columnData.info.versions
    if (this.versions.length === 0) {
      // no versions
      return
    }
    // columnData.currentVersion contains the system version Id whereas
    // this.currentVersion is the index to the version in the versions array
    let i = 0
    for ( i = 0; i < this.versions.length; i++) {
      if (this.versions[i].id === columnData.info.thisVersion) {
        break;
      }
    }
    this.currentVersion = i

    for (let i = this.versions.length -1; i >= 0; i--) {
      this.versions[i].buttonHtml = '<strong>v' + (i+1) + ':</strong> ' +
        moment(this.versions[i].time_from).format('D MMM YYYY, H:mm:ss') + ', ' +
        this.versions[i].author_name
      if (this.versions[i].minor) {
        this.versions[i].buttonHtml += '&nbsp;<em>[m]</em>'
      }
      if (this.versions[i].review) {
        this.versions[i].buttonHtml += '&nbsp;<em>[r]</em>'
      }
      if (i === this.versions.length -1) {
        this.versions[i].buttonHtml += ' (latest)'
      }
      let descr = this.versions[i].descr
      if (descr ==='') {
        descr = '---'
      }
      this.versions[i].buttonTitle = '(v' + (i+1) + ') Description: ' + descr
    }

    if (this.currentVersion === -1) {
      // no versions, transcription is blank
      //this.setVersionTitleButtonRaw('<strong>v0:</strong> Empty transcription', false)
      this.setVersionTitleButton(this.currentVersion, false)
      $('#versions-dropdown-ul-' + this.id).html('')
    } else {
      //this.setVersionTitleButtonRaw(this.versions[this.currentVersion].buttonHtml, true)
      this.setVersionTitleButton(this.currentVersion, true)
      let versionsUlHtml = ''
      for(let i = this.versions.length-1; i>=0; i--) {
        versionsUlHtml += '<li><button class="versionbutton" id="vbutton-' + this.columnNumber + '-' + i + '" ' +
          'title="' +  this.versions[i].buttonTitle  + '">'  +  this.versions[i].buttonHtml + '</button></li>'
      }
      $('#versions-dropdown-ul-' + this.id).html(versionsUlHtml)
      let thisObject = this
      for(let i = this.versions.length-1; i>=0; i--) {
        $('#vbutton-'+this.columnNumber+'-'+i).on('click', this.genOnClickVersionButton(i))
      }
    }
  }

  genOnClickVersionButton(versionIndex) {
    let thisObject = this
    return function() {
      if (thisObject.currentVersion === versionIndex) {
        return
      }
      thisObject.dispatchEvent('version-request', {
        versionIndex: versionIndex,
        versionId: thisObject.versions[versionIndex].id
      })
    }
  }

  setVersionTitleButtonRaw(titleHtml, allowDropdown) {
    let buttonHtml = ''
    let buttonSelector ='#versions-dropdown-button-' + this.id
    buttonHtml += titleHtml
    if (allowDropdown) {
      buttonHtml += '<span class="caret"></span>'
      $(buttonSelector).attr('data-toggle', 'dropdown')
    } else {
      $(buttonSelector).removeAttr('data-toggle')
    }
    $(buttonSelector).html(buttonHtml)
  }

  setVersionTitleButton(version, allowDropdown, withChanges = false) {
    let withChangesString = withChanges ? ' *' : ''
    if (version === -1 || this.versions.length === 0) {
      this.setVersionTitleButtonRaw('Empty Transcription' + withChangesString, false)
      return true
    }
    this.setVersionTitleButtonRaw(this.versions[this.currentVersion].buttonHtml + withChangesString, allowDropdown)
  }

  isCurrentVersionLatest()
  {
    return this.currentVersion === (this.versions.length -1)
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
    let formatBlots = TranscriptionEditor.formatBlots
    return function (delta, oldDelta, source)
    {
      if (!thisObject.enabled) {
        return false
      }
      // Check for split items (i.e., items with the same item id
      let itemIds = []
      let contents = thisObject.quillObject.getContents()
      let modifiedContents = false
      let newContents = { ops: [] }
      for (const op of contents.ops) {
        if (op.attributes) {
          let formatFound = false
          for (const formatBlot of formatBlots) {
            if (op.attributes[formatBlot.name] && op.attributes[formatBlot.name].itemid) {
              formatFound = true
              let id = parseInt(op.attributes[formatBlot.name].itemid)
              if (itemIds.indexOf(id) !== -1) {
                // duplicate id
                let newOp = op
                let newId = thisObject.getOneItemId()
                newOp.attributes[formatBlot.name].itemid = newId
                itemIds.push(newId)
                newContents.ops.push(newOp)
                modifiedContents = true
              } else {
                itemIds.push(id)
                newContents.ops.push(op)
              }
              break
            } 
          }
          if (!formatFound) {
            newContents.ops.push(op)
          }
        } else {
          newContents.ops.push(op)
        }
      }
      
      if (modifiedContents) {
        console.log('Duplicate ids found, setting up new quill content')
        let curSelection = thisObject.quillObject.getSelection()
        thisObject.quillObject.setContents(newContents, 'silent')
        thisObject.quillObject.setSelection(curSelection)
      }

      
      
      if (!areEqual(thisObject.quillObject.getContents(), thisObject.lastSavedData)) {
        thisObject.setContentsChanged()
      } else {
        thisObject.setContentsNotChanged()
      }
      //console.log('Number lines on Quill change')
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
      let toolbarSelector = '#toolbar-' + id
      if (range.length === 0) {
        $(toolbarSelector + ' .selFmtBtn').prop('disabled', true)
        $(toolbarSelector + ' .imgFmtBtn').prop('disabled', false)
        $(toolbarSelector + ' .chunkButton').prop('disabled', false)
        $(toolbarSelector + ' .lineGapButton').prop('disabled', false)
        $('#note-button-' + id).prop('disabled', false)
        thisObject.setDisableLangButtons(true)
        $('#edit-button-' + id).prop('disabled', true)
        if (TranscriptionEditor.rangeIsInMidItem(quillObject, range)) {
          $('#note-button-' + id).prop('disabled', true)
          $('#edit-button-' + id).prop('disabled', false)
          $(toolbarSelector + ' .imgFmtBtn').prop('disabled', true)
          return false
        }
        if (!TranscriptionEditor.indexIsInNormalLine(quillObject, range.index)) {
            $(toolbarSelector + ' .chunkButton').prop('disabled', true)
            $(toolbarSelector + ' .lineGapButton').prop('disabled', true)
        }
        return false
      }
      // Selection's length >= 1
      $(toolbarSelector + ' .imgFmtBtn').prop('disabled', true)
      $('#note-button-' + id).prop('disabled', true)
      
      const text = quillObject.getText(range)
      if (text.search('\n') !== -1) {
        // Selection includes new lines
        //console.log("Selection includes new lines")
        $(toolbarSelector + ' .selFmtBtn').prop('disabled', true)
        thisObject.setDisableLangButtons(false)
        return false
      }
      // Selection does not include new lines
      thisObject.setDisableLangButtons(false)
      //console.log("Selection does not include new lines")
      if (hasFormat) {
        $(toolbarSelector + ' .selFmtBtn').prop('disabled', true)
        $('#clear-button-' + id).prop('disabled', false)
        if (TranscriptionEditor.rangeIsInMidItem(quillObject, range)) {
          //console.log("Selection is mid item, disabling clear button")
          $('#edit-button-' + id).prop('disabled', false)
          $('#clear-button-' + id).prop('disabled', true)
          return false
        }
        $('#edit-button-' + id).prop('disabled', true)
      } else {
        $(toolbarSelector + ' .selFmtBtn').prop('disabled', false)
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
      console.log(`Current quill object contents`)
      console.log(quillObject.getContents())
      let typeLabel = type === 'start' ?  'Start' : 'End'
      $('#chunk-modal-title-' + thisObject.id).html('Chunk ' + typeLabel)
      let workOptionsHtml = ''
      for (const work of thisObject.activeWorks) {
        workOptionsHtml += `<option value="${work.dareId}" ${work.dareId===thisObject.lastSelectedWorkId
         ? 'selected' : ''}>${work.title}</option>`;
      }
      $('#chunk-modal-dareid-' + thisObject.id).html(workOptionsHtml)

      let chunkNumberSelector = '#chunk-modal-chunknumber-' + thisObject.id
      $(chunkNumberSelector).attr('min', 1)
      $(chunkNumberSelector).attr('max', 9999)
      $(chunkNumberSelector).val(thisObject.chunkNumberEntered)

      let localIdOptionsHtml = ''
      let localIdOptions = [ 'A', 'B', 'C', 'D', 'E']
      for(const localIdOption of localIdOptions) {
        localIdOptionsHtml += '<option value="' + localIdOption + '" '
        if (localIdOption==='A') {
          localIdOptionsHtml += 'selected'
        }
        localIdOptionsHtml += '>'
        localIdOptionsHtml += localIdOption
        localIdOptionsHtml += '</option>'
      }
      let localIdSelector = '#chunk-modal-localid-' + thisObject.id
      $(localIdSelector).html(localIdOptionsHtml)

      let segmentSelector = '#chunk-modal-segment-' + thisObject.id
      $(segmentSelector).attr('min', 1)
      $(segmentSelector).attr('max', 100)
      $(segmentSelector).val(1)

      let submitButtonSelector = '#chunk-modal-submit-button-' + thisObject.id

      $(submitButtonSelector).off()
      $(submitButtonSelector).on('click', function () {
        $('#chunk-modal-' + thisObject.id).modal('hide')
        const itemid = thisObject.getOneItemId()
        const workId = $('#chunk-modal-dareid-' + thisObject.id).val()
        thisObject.lastSelectedWorkId = workId;
        const chunkno = $('#chunk-modal-chunknumber-' + thisObject.id).val();
        thisObject.chunkNumberEntered = parseInt(chunkno);
        const segment = $('#chunk-modal-segment-' + thisObject.id).val()
        const localId = $('#chunk-modal-localid-' + thisObject.id).val()
        quillObject.insertEmbed(range.index, 'chunkmark', {
          alttext: type,
          target: chunkno,
          text: workId,
          itemid: itemid,
          thelength: segment,
          extrainfo: localId,
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

  genChapterMarkButtonFunction(type) {
    let thisObject = this
    let quillObject = this.quillObject
    let typeLabel = type === 'start' ?  'Start' : 'End'
    return function () {
      const range = quillObject.getSelection()
      if (range === null || range.length > 0) {
        return false
      }
      $('#chapter-modal-dialogtitle-' + thisObject.id).html('Chapter ' + typeLabel)
      let workOptionsHtml = ''
      for (const work of thisObject.activeWorks) {
        workOptionsHtml += '<option value="' + work.dareId + '">'
          + work.title + '</option>'
      }
      $('#chapter-modal-dareid-' + thisObject.id).html(workOptionsHtml)

      let levelSelector = '#chapter-modal-level-' + thisObject.id
      $(levelSelector).attr('min', 1)
        .attr('max', 5)
        .val(1)

      let appellationsOptionsHtml = ''
      let appellations = validAppellations[thisObject.defaultLang]
      for (let i = 0; i < appellations.length; i++) {
        appellationsOptionsHtml += '<option value="' + appellations[i] + '" '
        if (i===0) {
          appellationsOptionsHtml += 'selected'
        }
        appellationsOptionsHtml += '>'
        appellationsOptionsHtml += appellations[i]
        appellationsOptionsHtml += '</option>'
      }

      let appellationsSelector = '#chapter-modal-appellation-' + thisObject.id
      $(appellationsSelector).html(appellationsOptionsHtml)

      let numberSelector = '#chapter-modal-number-' + thisObject.id
      $(numberSelector).attr('min', 1)
        .attr('max', 100)
        .val(1)

      let submitButtonSelector = '#chapter-modal-submit-button-' + thisObject.id

      let titleElement = $('#chapter-modal-title-' + thisObject.id)
      titleElement.on('keyup', () => {
        let title = titleElement.val()
        title = thisObject.trimWhiteSpace(title)
        if (title === '') {
          $(submitButtonSelector).attr('disabled', true)
        } else {
          $(submitButtonSelector).attr('disabled', false)
        }
      })



      $(submitButtonSelector).off()
      $(submitButtonSelector).on('click', function () {
        $('#chapter-modal-' + thisObject.id).modal('hide')
        const itemid = thisObject.getOneItemId()
        const workId = $('#chapter-modal-dareid-' + thisObject.id).val()
        const chapterNumber = $('#chapter-modal-number-' + thisObject.id).val()
        const chapterLevel = $('#chapter-modal-level-' + thisObject.id).val()
        const chapterAppellation = $('#chapter-modal-appellation-' + thisObject.id).val()
        let chapterTitle = $('#chapter-modal-title-' + thisObject.id).val()
        chapterTitle = thisObject.trimWhiteSpace(chapterTitle)

        if (chapterTitle === '') {
          console.warn('Empty chapter title!')
          return false
        }
        let text = [ chapterAppellation, chapterTitle].join("\t")
        quillObject.insertEmbed(range.index, 'chaptermark', {
          alttext: type,
          target: chapterNumber,
          text: text ,
          itemid: itemid,
          thelength: chapterLevel,
          extrainfo: workId,
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + 1)
        // Take care of notes!
        const noteText = $('#chapter-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(itemid, noteText)
        }
      })
      $('#chapter-modal-' + thisObject.id).modal('show')
    }
  }
  
  resizeContainer()
  {
    let cont = $('#editor-container-container-' + this.id)
    let contHeight = this.containerElement.height()
    let newHeight = contHeight - cont.position().top
    cont.css('height',  newHeight + 'px')
  }

  genOnResize()
  {
    let thisObject = this
    return function (e)
    {

      thisObject.resizeContainer()
      //console.log('Number lines on resize')
      thisObject.numberLines()
    }
  }

  genOnClickLangButton(langDef) {
    let quillObject = this.quillObject
    return  ()=> {
      let delta = quillObject.format('lang', langDef['code']);
      console.log(`Set lang ${langDef['code']} at selection`, delta);
      const range = quillObject.getSelection();
      quillObject.setSelection(range.index + range.length);
    }
  }
  
  
  getTargets (itemId = -1) {
    // TODO: implement this using registered blots!
    const ops = this.quillObject.getContents().ops
    const targets = [{itemid: 0, text: '[none]'}]
    const potentialTargets = []
   
    const additionTargets = []
    for (const curOps of ops) {
      if (curOps.insert !== '\n' &&
                        'attributes' in curOps) {
        if (curOps.attributes.deletion) {
          potentialTargets.push({
            itemid: parseInt(curOps.attributes.deletion.itemid),
            text: 'Deletion: ' + curOps.insert
          })
        }
        if (curOps.attributes.unclear) {
          potentialTargets.push({
            itemid: parseInt(curOps.attributes.unclear.itemid),
            text: 'Unclear: ' + curOps.insert
          })
        }
        if (curOps.attributes.marginalmark) {
          potentialTargets.push({
            itemid: parseInt(curOps.attributes.marginalmark.itemid),
            text: 'Mark: ' + curOps.insert
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
        if (theBlot.target.default === 0) {
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
      //console.log('Number lines on click zoom')
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
      
      let fields = ['place', 'target']
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
        if (theBlot.target.default === 0) {
          theValue.targetText = '[none]'
        }
      }
      if (!needsDialog) {
        quillObject.format(theBlot.name, theValue)
        // Disable chunk and line gap buttons 
        $('.chunkButton').prop('disabled', true)
        $('.lineGapButton').prop('disabled', true)
        return true
      }
      // Needs dialog
      TranscriptionEditor.resetMarginalModal(thisObject.id)
      $('#marginal-modal-title-' + thisObject.id).html(theBlot.title)
      if (theBlot.place) {
        $('#marginal-modal-place-label-' + thisObject.id).html(theBlot.place.title)
        $('#marginal-modal-place-fg-' + thisObject.id).show()
        let optionsHtml = ''
        for (const option of theBlot.place.options) {
          optionsHtml += '<option value="' + option + '"'
          optionsHtml += '>' + option + '</option>'
        }
        $('#marginal-modal-place-' + thisObject.id).html(optionsHtml)
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
        $('#marginal-modal-target-' + thisObject.id).html(targetsHtml)
        $('#marginal-modal-target-label-' + thisObject.id).html(theBlot.target.title)
        $('#marginal-modal-target-fg-' + thisObject.id).show()
      }
      $('#marginal-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#marginal-modal-' + thisObject.id).modal('hide')
        if (theBlot.place) {
          theValue.place = $('#marginal-modal-place-' + thisObject.id).val()
        }
        if (theBlot.target) {
          const target = parseInt($('#marginal-modal-target-' + thisObject.id).val())
          let targetText = ''
          for (const someT of targets) {
            if (target === someT.itemid) {
              targetText = someT.text
              break
            }
          }
          theValue.target = target
          theValue.targetText = targetText
        }
        quillObject.format(theBlot.name, theValue)
      })
      $('#marginal-modal-' + thisObject.id).modal('show')
    }
  }

  genOnClickToggleEnableButton()
  {
    let thisObject = this
    return function ()
    {
      thisObject.toggleEnable()
      //console.log('Number lines on click toggle enable')
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

  genOnClickSetLang(langId)
  {
    return  () =>{
      let langCode = getLangCodeFromLangId(langId);
      this.setDefaultLang(langCode);
      this.setEditorMargin(this.fontSize);
      $('#lang-button-' + this.id).html(langCode);
      // delay a little bit, wait for html elements to be ready
      window.setTimeout( ()=>  {
        this.numberLines();
      }, 100)
    }
  }
  
  genOnClickSaveButton()
  {
    let thisObject = this
    return function(){
      if (!thisObject.isCurrentVersionLatest()) {
        $('#version-modal-text-'+ thisObject.id)
          .addClass('text-danger')
          .html('<i class="fas fa-exclamation-triangle" aria-hidden="true"></i> Your changes are not based on the latest version')
        $('#version-modal-descr-'+thisObject.id).val("Edited from version " + (thisObject.currentVersion+1))
      } else {
        $('#version-modal-text-'+ thisObject.id)
          .removeClass('text-danger')
          .html('')
        $('#version-modal-descr-'+thisObject.id).val('')
      }
      $('#version-modal-submit-button-' + thisObject.id)
        .off()
        .on('click', function(){
          $('#version-modal-' + thisObject.id).modal('hide')
          let versionInfo = {
            descr: $('#version-modal-descr-'+thisObject.id).val(),
            isMinor: $('#version-modal-minor-cb-'+thisObject.id).prop('checked'),
            isReview: $('#version-modal-review-cb-'+thisObject.id).prop('checked'),
          }
          thisObject.save(versionInfo)
          return true
        })
      $('#version-modal-' + thisObject.id).modal('show')
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
            let currentTarget = parseInt(format[formatBlot.name].target)
            let currentTargetText = format[formatBlot.name].targetText
            targets = thisObject.getTargets()
            if (currentTarget !== 0) {
              targets.push({itemid: currentTarget, text: currentTargetText})
            }
            let targetsHtml = ''
            for (const theTarget of targets) {
              targetsHtml += '<option value="' + theTarget.itemid + '"'
              if (theTarget.itemid === currentTarget) {
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
      authorTid: this.editorTid,
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
                    thisObject.people[note.authorId].name +
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
    for (const type of
      ['rubric', 'gliph', 'initial', 'sic', 'abbr', 'deletion',
        'addition', 'unclear', 'nowb', 'mathtext', 'marginalmark',
        'boldtext', 'italic', 'heading1']) {
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
      //console.log('Number lines on image loaded')
      editorObject.numberLines()
    })
  }
  
  static setUpPopover (node, title, text, editorId, itemid, noText = false) {
    $(node).popover({
      content: function () {
        const editorObject = TranscriptionEditor.editorsById[editorId]
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
                        editorObject.people[note.authorTid].name +
                        ' @ ' +
                        note.time + '</footer>'
          ednotesHtml += '</blockquote>'
        }
        return t + ednotesHtml
      },
      container: 'body',
      animation: false,
      template: '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-body"></div></div>',
      delay: { 'show': 1500, 'hide': 0},
      html: true,
      placement: 'auto',
      sanitize: false,
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

  trimWhiteSpace(someString) {
    return someString.replace(/^\s+/, '').replace(/\s+$/, '')
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
    //console.log(`rangeIsInMidItem prev=${prevItem}, next=${nextItem}`)
    if (prevItem === nextItem) {
      // same format
      if (prevItem === false) {
        return false
      }
      if (prevFormat[prevItem]['itemid'] === nextFormat[prevItem]['itemid']) {
        console.log("Diferent item ids")
        return true
      }
    }
    return false
  }
  
  static indexIsInNormalLine(quillObject, index) {
    let [line,] = quillObject.getLine(index)
    return !(line instanceof SimpleBlockBlot);

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
  
  static resetMarginalModal (id) {
    $('#marginal-modal-title-' + id).html('')
    $('#marginal-modal-place-fg-' + id).hide()
    $('#marginal-modal-target-fg-' + id).hide()
    $('#marginal-modal-submit-button-' + id).off()
  }
  
  
  
  static registerEvent(eventName)
  {
    if (TranscriptionEditor.events === undefined) {
      TranscriptionEditor.events = []
    }
    TranscriptionEditor.events.push(eventName)
  }

  /**
   *
   * @param {number}id
   * @param {TranscriptionEditor}editorObject
   */
  static registerEditorInstance(id, editorObject) 
  {
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
    if (options.target) {
      theBlot.target = options.target
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
    if (options.getPopoverText === undefined) {
      options.getPopoverText = false
    }
    theBlot.className = options.className
    theBlot.title = options.title
    theBlot.imageAlt = options.imageAlt
    theBlot.withPopover = options.withPopover
    theBlot.renumberLinesOnImageLoad = options.renumberLinesOnImageLoad
    theBlot.getImageUrl = options.getImageUrl
    theBlot.getPopoverText = options.getPopoverText
    
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
  
  static registerLineGapBlot(theBlot, options) {
    TranscriptionEditor.lineGapBlot = theBlot
  }
  
  static init(baseUrl)
  {

    /**
     * @var {string}
     */
    TranscriptionEditor.baseUrl = baseUrl;
    /**
     *
     * @type {TranscriptionEditor[]}
     */
    TranscriptionEditor.editors = [];
    /**
     *
     * @type {TranscriptionEditor[]}
     */
    TranscriptionEditor.editorsById = [];

    TranscriptionEditor.registerEvent('editor-enable')
    TranscriptionEditor.registerEvent('editor-disable')
    TranscriptionEditor.registerEvent('editor-save')
    TranscriptionEditor.registerEvent('editor-reset')
    TranscriptionEditor.registerEvent('version-request')
    TranscriptionEditor.editorTemplate = Twig.twig({
      id: 'editor',
      data: `
<div class="transcription-editor">
  {#  TOP TOOLBAR #}  
  <div id="editor-controls-{{id}}" class="editor-controlbar">
      <button id="zoom-in-button-{{id}}" title="Make text bigger"><i class="fas fa-search-plus"></i></button>
      <button id="zoom-out-button-{{id}}" title="Make text smaller"><i class="fas fa-search-minus"></i></button>
      <button id="toggle-button-{{id}}" title="Edit">E</button>
      <button id="save-button-{{id}}" title="Save changes"><i class="far fa-save"></i></button>
      <button id="reset-button-{{id}}" title="Revert to saved version"><i class="fas fa-sync"></i></button>
      <span class="dropdown">
        <button class="versionbutton" title="Transcription version currently shown below" 
            id="versions-dropdown-button-{{id}}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        </button>
         <ul class="dropdown-menu" id="versions-dropdown-ul-{{id}}" aria-labelledby="versions-dropdown-button-{{id}}"></ul>
      </span>
      
  </div>
      
  {#  BOTTOM TOOLBAR #}
  <div class="toolbar" id="toolbar-{{id}}">
      
    {# Clear and Edit #}
    <button id="clear-button-{{id}}" class="selFmtBtn" title="Clear formatting" disabled><i class="fas fa-eraser"></i></button>
    <button id="edit-button-{{id}}" class="selFmtBtn" title="Edit" disabled><i class="fas fa-pencil-alt"></i></button>
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
    <button id="chapter-start-button-{{id}}" class="imgFmtBtn chapterButton"  title="Chapter Start">[</button>
    <button id="chapter-end-button-{{id}}" class="imgFmtBtn chapterButton"  title="Chapter End">]</button>
    <span class="separator"/>
      
    {# Special characters #}
    <span id="specialCharacterButtons-{{id}}"></span>
    <span class="separator"/>

    {# Editorial Note #}
    <button id="note-button-{{id}}" title="Editorial Note"><i class="far fa-comment"></i></button>
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
    <div class="dropdown dropdown-button">
        <button class="dropdown-toggle" type="button" id="lang-button-{{id}}" title="Latin" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
            la
       </button>
        <div class="dropdown-menu" id="set-lang-dd-menu-{{id}}" aria-labelledby="lang-button-{{id}}">
       </div>
    </div>
    <span class="separator"/>
      


    <span class="separator"/>
</div>
<div id="editor-container-container-{{id}}" style="overflow-y: scroll; height: 500px; position: relative;">
  <div id="editor-container-{{id}}" class="editor-container"></div>
</div>
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
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header">
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
                        <input type="number" name="length" class="form-control" id="item-modal-length-{{id}}"/>
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
                  </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="item-modal-cancel-button-{{id}}" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="item-modal-submit-button-{{id}}">Submit</button>
            </div>
        </div>
    </div>
</div>
 
 <!-- MARGINAL modal {{id}} -->            
<div id="marginal-modal-{{id}}" class="modal" role="dialog">
    <div class="modal-dialog modal-sm" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h4 id="marginal-modal-title-{{id}}" class="modal-title"></h4>
            </div>
            <div class="modal-body" id="marginal-modal-body-{{id}}">
                <form>
                    <div id="marginal-modal-place-fg-{{id}}" class="form-group">
                        <label for="marginal-modal-place-{{id}}" id="marginal-modal-place-label-{{id}}" class="control-label">Place:</label>
                        <select name="place" id="marginal-modal-place-{{id}}"></select>
                    </div>
                    <div id="marginal-modal-target-fg-{{id}}" class="form-group">
                        <label for="marginal-modal-target-{{id}}" id="marginal-modal-target-label-{{id}}" class="control-label">Replaces:</label>
                        <select name="target" id="marginal-modal-target-{{id}}"></select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="marginal-modal-cancel-button-{{id}}" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="marginal-modal-submit-button-{{id}}">Submit</button>
            </div>
        </div>
    </div>
</div>
            
<!-- CHUNK modal {{id}} -->            
<div id="chunk-modal-{{id}}" class="modal" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h4 id="chunk-modal-title-{{id}}" class="modal-title">Chunk</h4>
            </div>
            <div class="modal-body" id="chunk-modal-body-{{id}}">
                <form>
                    <div id="chunk-modal-work-fg-{{id}}" class="form-group">
                        <label for="chunk-modal-work-{{id}}" class="control-label">Work:</label>
                        <select name="chunk-modal-dareid" id="chunk-modal-dareid-{{id}}"></select>
                    </div>
      
                    <div id="chunk-modal-chunknumber-fg-{{id}}" class="form-group">
                        <label for="chunk-modal-chunknumber-{{id}}" id="chunk-modal-chunknumber-label-{{id}}" class="control-label">Chunk Number:</label>
                        <input type="number" name="chunk" class="form-control" id="chunk-modal-chunknumber-{{id}}"/>
                    </div>
                    
                    <div id="chunk-modal-localid-fg-{{id}}" class="form-group">
                        <label for="chunk-modal-localid-{{id}}" id="chunk-modal-localid-label-{{id}}" class="control-label">Witness Id in document:</label>
                        <select name="chunk-modal-localid" id="chunk-modal-localid-{{id}}"></select>
                    </div>
      
                    <div id="chunk-modal-segment-fg-{{id}}" class="form-group">
                        <label for="chunk-modal-segment-{{id}}" id="chunk-modal-segment-label-{{id}}" class="control-label">Segment Number:</label>
                        <input type="number" name="segment" class="form-control" id="chunk-modal-segment-{{id}}"/>
                    </div>


                    <input id="chunk-note-id-{{id}}" type="hidden" name="note-id" value=""/>
                    <div class="form-group">
                        <label for="chunk-note-{{id}}" class="control-label">Note:</label>
                        <input type="text" class="form-control" id="chunk-note-{{id}}">
                        <p class="chunk-note-edit-time" id="chunk-note-time-{{id}}"></p>
                    </div>
                    <div class="modal-ednotes" id="chunk-modal-ednotes-{{id}}">
                    </div>
               </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="chunk-modal-cancel-button-{{id}}" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="chunk-modal-submit-button-{{id}}">Submit</button>
            </div>
        </div>
    </div>
</div>           


<!-- CHAPTER modal {{id}} -->            
<div id="chapter-modal-{{id}}" class="modal" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h4 id="chapter-modal-dialogtitle-{{id}}" class="modal-title">Chapter</h4>
            </div>
            <div class="modal-body" id="chunk-modal-body-{{id}}">
                <form>
                    <div id="chapter-modal-work-fg-{{id}}" class="form-group">
                        <label for="chapter-modal-work-{{id}}" class="control-label">Work:</label>
                        <select name="chapter-modal-dareid" id="chapter-modal-dareid-{{id}}"></select>
                    </div>
      
                    <div id="chapter-modal-level-fg-{{id}}" class="form-group">
                        <label for="chapter-modal-level-{{id}}" id="chapter-modal-level-label-{{id}}" class="control-label">Chapter Level:</label>
                        <input type="number" name="chunk" class="form-control" id="chapter-modal-level-{{id}}"> </input>
                    </div>
      
                    <div id="chapter-modal-number-fg-{{id}}" class="form-group">
                        <label for="chapter-modal-number-{{id}}" id="chapter-modal-number-label-{{id}}" class="control-label">Chapter Number:</label>
                        <input type="number" name="segment" class="form-control" id="chapter-modal-number-{{id}}"> </input>
                    </div>
                    
                      <div id="chapter-modal-appellation-fg-{{id}}" class="form-group">
                        <label for="chapter-modal-appellation-{{id}}" id="chapter-modal-appellation-label-{{id}}" class="control-label">Appellation:</label>
                        <select name="chapter-modal-appellation" id="chapter-modal-appellation-{{id}}"></select>
                    </div>
                    
                    <div class="form-group">
                        <label for="chapter-modal-title-{{id}}" class="control-label">Chapter Title:</label>
                        <input type="text" class="form-control" id="chapter-modal-title-{{id}}">
                    </div>

                    <input id="chapter-note-id-{{id}}" type="hidden" name="note-id" value=""/>
                    <div class="form-group">
                        <label for="chapter-note-{{id}}" class="control-label">Note:</label>
                        <input type="text" class="form-control" id="chapter-note-{{id}}">
                        <p class="chapter-note-edit-time" id="chapter-note-time-{{id}}"></p>
                    </div>
                    <div class="modal-ednotes" id="chapter-modal-ednotes-{{id}}">
                    </div>
               </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="chapter-modal-cancel-button-{{id}}" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="chapter-modal-submit-button-{{id}}">Submit</button>
            </div>
        </div>
    </div>
</div>           
            
<!-- ALERT modal {{id}} -->             
<div id="alert-modal-{{id}}" class="modal" role="dialog">
    <div class="modal-dialog modal-sm " role="document">
        <div class="modal-content">
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
    </div>
</div>

<!-- VERSION modal {{id}} -->             
<div id="version-modal-{{id}}" class="modal" role="dialog">
  <div class="modal-dialog modal-sm " role="document">
    <div class="modal-content">
        <div class="modal-header">
            <h4 id="version-modal-title-{{id}}">Save New Version</h4>
        </div>
        <div class="modal-body" id="alert-modal-body-{{id}}">
            <form>
                <p id="version-modal-text-{{id}}"></p>
                <div id="version-modal-descr-fg-{{id}}" class="form-group">
                    <label for="version-modal-descr-{{id}}" id="version-modal-descr-label-{{id}}" class="control-label">Description (optional):</label>
                    <input type="text" class="form-control" id="version-modal-descr-{{id}}">
                </div>
                <div class="checkbox">
                    <label><input type="checkbox" id="version-modal-minor-cb-{{id}}">Minor changes <em>[m]</em></label>
                </div>
                <div class="checkbox">
                    <label><input type="checkbox" id="version-modal-review-cb-{{id}}">Peer/Supervisor Review <em>[r]</em></label>
                </div>
            </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="version-modal-cancel-button-{{id}}" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-danger" id="version-modal-submit-button-{{id}}">Save</button>
        </div>
    </div>
  </div>
</div>

<!-- TEXT measuring div -->
<div id="text-measurement-{{id}}" style="position:absolute; visibility: hidden; height: auto; width: auto; white-space: nowrap; direction: ltr;">
   Some text
</div>
`
    })
    configureTranscriptionEditorBlots();
  }
}


function areEqual(var1, var2) {
  return JSON.stringify(var1) === JSON.stringify(var2)
}
