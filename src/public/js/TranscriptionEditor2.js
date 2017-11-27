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

/* global Twig, Quill, _, EditorData */

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
      $('#set-lang-dd-menu-' + id).append('<li><a id="'+ optionId +'">' + langDef[lang].name + '</a></li>')
      $('#' + optionId).on('click', this.genOnClickSetLang(lang))
    }
   
    // Simple formats
    for (const formatBlot of TranscriptionEditor.formatBlots) {
      let buttonId = formatBlot.name + '-button-' + this.id
      $('#simpleFormatButtons-'+this.id).append(
              '<button id="' + buttonId +  '" ' + 
              'class="selFmtBtn" ' +
              'title="' + formatBlot.title + '">' + 
              formatBlot.icon + '</button>'
        )
      $('#'+buttonId).on('click', this.genOnClickSimpleFormat(formatBlot.name))
      $(containerSelector).on('dblclick','.' + formatBlot.className, 
          this.genOnDoubleClickSimpleFormat())
    }

    // Block formats
    $('#line-button-' + id).on('click', this.genOnClickLineButton())
    
    for (const blockBot of TranscriptionEditor.blockBlots) {
      let buttonId = blockBot.name + '-button-' + this.id
      $('#simpleBlockButtons-'+this.id).append(
              '<button id="' + buttonId +  '" ' + 
              'title="' + blockBot.title + '">' + 
              blockBot.icon + '</button>'
        )
      $('#'+buttonId).on('click', this.genOnClickSimpleBlockButton(blockBot.name))
    }

    

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
    //$('#' + lang + '-button-' + this.id).prop('disabled', true)
    $('#lang-button-' + this.id).attr('title', langDef[lang].name)
    $('#lang-button-' + this.id).html(lang)
    this.defaultLang = lang
    // ChunkMarkBlot.dir = lang === 'la' ? 'ltr' : 'ltr';
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
    //    IllegibleBlot.size = this.fontSize
    //    NoWordBreakBlot.size = this.fontSize
    //    MarkBlot.size = this.fontSize
    //    ChunkMarkBlot.size = this.fontSize
    //    LineGapBlot.size = this.fontSize
    //    CharacterGapBlot.size = this.fontSize
    //    ParagraphMarkBlot.size = this.fontSize
  }
  
  setEditorMargin() 
  {
    let marginSize = this.getEditorMarginSize()
    if (this.options.langDef[this.defaultLang].rtl) {
      $('#editor-container-' + this.id + ' .ql-editor').css('margin-left', '0')
      $('#editor-container-' + this.id + ' .ql-editor').css('margin-right', marginSize + 'px')
      return true
    }
    $('#editor-container-' + this.id + ' .ql-editor').css('margin-right', '0')
    $('#editor-container-' + this.id + ' .ql-editor').css('margin-left', marginSize + 'px')
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
    let editorDiv = $('#' + this.containerId + ' ' + '.ql-editor')
    let editorContainerLeftPos = $(editorDiv).offset().left
    let lineNumber = 0
    let overlayNumber = 0
    for (const p of pElements) {
      let theP = $(p)
      let offset = theP.offset()
      let fontFactor = this.options.lineNumbers.fontFactor  /// line number font size to editor font size 
      let editorFontSize = this.calcEditorFontEmSize(this.fontSize)*this.options.pixPerEm
      let lineNumberTopPos = offset.top 
      let fontEmSize = this.calcEditorFontEmSize(this.fontSize)*fontFactor
      let fontCharWidth = fontEmSize*this.options.pixPerEm*this.options.lineNumbers.charWidth
      let numberMargin = this.options.lineNumbers.margin;
      let numChars = this.options.lineNumbers.numChars;
      let lineNumberLeftPos = editorContainerLeftPos - numberMargin - numChars*fontCharWidth;
      if (this.defaultLang !== 'la') {
        lineNumberLeftPos = editorContainerLeftPos + $(editorDiv).outerWidth() + numberMargin;
      }
      let overlay = ''
      let lineNumberLabel = '-'
      switch (this.getParagraphType(theP)) {
        case 'normal':
          lineNumberLabel = TranscriptionEditor.padNumber(++lineNumber, numChars, '&nbsp;')
          break;

        case 'custodes':
          lineNumberLabel = '<a title="Custodes">&nbsp;C</a>'
          break

        case 'pagenumber':
          lineNumberLabel = '<a title="Page Number">PN</a>'
          break

        case 'headelement':
          lineNumberLabel = '<a title="Head">&nbsp;H</a>'
          break

      }
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
      $('body').append(overlay)
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
    
    let editorData = EditorData.getEditorDataFromApiData(columnData, this.id, this.options.langDef, this.minItemId)
  
    this.minItemId = editorData.minItemId
    this.quillObject.setContents(editorData.delta)
    this.lastSavedData = this.quillObject.getContents()
    let mainLang = editorData.mainLang
    if (!mainLang) {
      mainLang = this.pageDefaultLang
    }
    
    this.setDefaultLang(mainLang)
  }
  
  getQuillData() 
  {
    return this.quillObject.getContents()
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
      //console.log("Selection: @" + range.index + ", l=" + range.length)
      const hasFormat = TranscriptionEditor.selectionHasFormat(quillObject, range)
      //console.log("Has format: " + hasFormat)
      if (range.length === 0) {
        $('.selFmtBtn').prop('disabled', true)
        thisObject.setDisableLangButtons(true)
        $('#edit-button-' + id).prop('disabled', true)
        if (TranscriptionEditor.rangeIsInMidItem(quillObject, range)) {
          $('#note-button-' + id).prop('disabled', true)
          $('#illegible-button-' + id).prop('disabled', true)
          $('#nowb-button-' + id).prop('disabled', true)
          $('#chunk-start-button-' + id).prop('disabled', true)
          $('#chunk-end-button-' + id).prop('disabled', true)
          $('#edit-button-' + id).prop('disabled', false)
          return false
        }
        $('#note-button-' + id).prop('disabled', false)
        $('#illegible-button-' + id).prop('disabled', false)
        $('#nowb-button-' + id).prop('disabled', false)
        $('#chunk-start-button-' + id).prop('disabled', false)
        $('#chunk-end-button-' + id).prop('disabled', false)

        return false
      }
      // Selection's length >= 1
      
      $('#note-button-' + id).prop('disabled', true)
      $('#illegible-button-' + id).prop('disabled', true)
      $('#nowb-button-' + id).prop('disabled', true)
      $('#chunk-start-button-' + id).prop('disabled', true)
      $('#chunk-end-button-' + id).prop('disabled', true)
      
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

  genOnResize()
  {
    let thisObject = this
    return function (e)
    {
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

  genOnClickSimpleFormat(format) {
    let thisObject = this
    let quillObject = this.quillObject
    return function () {
      if (!thisObject.enabled) {
        return true
      }
      let value =  {
        itemid: thisObject.getOneItemId(),
        editorid: thisObject.id
      }
      if (TranscriptionEditor.formatBlots.alttext) {
        value.alttext = '' // change this!
      }
      quillObject.format(format, value)
      const range = quillObject.getSelection()
      quillObject.setSelection(range.index + range.length)
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

  genOnClickSimpleBlockButton(format) 
  {
    let quillObject = this.quillObject
    return function ()
    {
      quillObject.format(format, true)
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
      //let additionTargets = []
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Unknown')
      
//      if (format.abbr) {
//        altText = format.abbr.expansion
//        itemid = format.abbr.itemid
//        $('#item-modal-text-fg-' + thisObject.id).show()
//        $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
//        $('#item-modal-alttext-' + thisObject.id).val(altText)
//        $('#item-modal-alttext-label-' + thisObject.id).html('Expansion:')
//        $('#item-modal-alttext-fg-' + thisObject.id).show()
//        $('#item-modal-title-' + thisObject.id).html('Abbreviation')
//      }
//      if (format.unclear) {
//        altText = format.unclear.reading2
//        itemid = format.unclear.itemid
//        $('#item-modal-text-fg-' + thisObject.id).show()
//        $('#item-modal-extrainfo-label-' + thisObject.id).html('Reason:')
//        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
//        let optionsHtml = ''
//        for (const reason of Item.getValidUnclearReasons()) {
//          optionsHtml += '<option value="' + reason + '"'
//          if (reason === format.unclear.reason) {
//            optionsHtml += ' selected'
//          }
//          optionsHtml += '>' + reason + '</option>'
//        }
//        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
//        $('#item-modal-alttext-' + thisObject.id).val(altText)
//        $('#item-modal-alttext-label-' + thisObject.id).html('Alt. Reading')
//        $('#item-modal-alttext-fg-' + thisObject.id).show()
//        $('#item-modal-title-' + thisObject.id).html('Unclear')
//      }
//      if (format.deletion) {
//        itemid = format.deletion.itemid
//        const technique = format.deletion.technique
//        $('#item-modal-text-fg-' + thisObject.id).show()
//        $('#item-modal-alttext-fg-' + thisObject.id).hide()
//        $('#item-modal-extrainfo-label-' + thisObject.id).html('Technique:')
//        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
//        let optionsHtml = ''
//        for (const tech of Item.getValidDeletionTechniques()) {
//          optionsHtml += '<option value="' + tech + '"'
//          if (tech === technique) {
//            optionsHtml += ' selected'
//          }
//          optionsHtml += '>' + tech + '</option>'
//        }
//        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
//        $('#item-modal-title-' + thisObject.id).html('Deletion')
//      }
//      // Element::ADDITION
//      if (format.addition) {
//        itemid = format.addition.itemid
//        const target = format.addition.target
//        const place = format.addition.place
//        $('#item-modal-text-fg-' + thisObject.id).show()
//        $('#item-modal-alttext-fg-' + thisObject.id).hide()
//        $('#item-modal-extrainfo-label-' + thisObject.id).html('Place:')
//        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
//
//        let optionsHtml = ''
//        for (const thePlace of Item.getValidAdditionPlaces()) {
//          optionsHtml += '<option value="' + thePlace + '"'
//          if (thePlace === place) {
//            optionsHtml += ' selected'
//          }
//          optionsHtml += '>' + thePlace + '</option>'
//        }
//        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
//        additionTargets = thisObject.getAdditionTargets(itemid)
//                // console.log(additionTargets);
//
//        let targetsHtml = ''
//        for (const theTarget of additionTargets) {
//          targetsHtml += '<option value="' + theTarget.itemid + '"'
//          if (theTarget.itemid === target) {
//            targetsHtml += ' selected'
//          }
//          targetsHtml += '>' + theTarget.text + '</option>'
//        }
//        $('#item-modal-target-' + thisObject.id).html(targetsHtml)
//        $('#item-modal-target-label-' + thisObject.id).html('Replaces:')
//        $('#item-modal-target-fg-' + thisObject.id).show()
//
//        $('#item-modal-title-' + thisObject.id).html('Addition')
//      }
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
            if (formatBlot.alttext) {
              let altText = $('#item-modal-alttext-' + thisObject.id).val()
              quillObject.format(formatBlot.name, {alttext: altText, itemid: itemid, editorid: thisObject.id }) 
            }
          }
        }
//        if (format.unclear) {
//          let altText = $('#item-modal-alttext-' + thisObject.id).val()
//          if (altText === '') {
//            altText = ' '
//          }
//          const reason = $('#item-modal-extrainfo-' + thisObject.id).val()
//          quillObject.format('unclear', {reading2: altText, reason: reason, itemid: itemid, 
//            editorid: thisObject.id })
//        }
//        if (format.deletion) {
//          const technique = $('#item-modal-extrainfo-' + thisObject.id).val()
//          quillObject.format('deletion', {technique: technique, itemid: itemid, 
//            editorid: thisObject.id })
//        }
//        if (format.addition) {
//          const place = $('#item-modal-extrainfo-' + thisObject.id).val()
//          const target = parseInt($('#item-modal-target-' + thisObject.id).val())
//          let targetText = ''
//          for (const someT of additionTargets) {
//            if (target === someT.itemid) {
//              targetText = someT.text
//              break
//            }
//          }
//          quillObject.format('addition', {place: place,
//            itemid: itemid,
//            editorid: thisObject.id,
//            target: target,
//            targetText: targetText
//          })
        //})
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
    for (const op of delta.ops.entries()) {
      if (typeof op.insert !== 'object') {
        continue
      }
      for (const type of ['chunkmark', 'nowb', 'mark', 'illegible']) {
        if (type in op.insert) {
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
  
  static setUpPopover (node, title, text, editorid, itemid, noText = false) {
    $(node).popover({
      content: function () {
        
        const editorObject = TranscriptionEditor.editors[editorid]
        const ednotes = editorObject.getEdnotesForItemId(itemid)
        const theText = node.textContent
        let t = '<h3 class="editor-popover-title">' + title + '</h3>'
        if (!noText) {
          t += '<b>Text</b>: ' + theText + '<br/>'
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
  
  static resetItemModal (id) {
    $('#item-modal-title-' + id).html('')
    $('#item-modal-text-fg-' + id).hide()
    $('#item-modal-alttext-fg-' + id).hide()
    $('#item-modal-extrainfo-fg-' + id).hide()
    $('#item-modal-length-fg-' + id).hide()
    $('#item-modal-target-fg-' + id).hide()
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
    TranscriptionEditor.editors[id] = editorObject
  }
  static registerBlockBlot(theBlot, options)
  {
    if (TranscriptionEditor.blockBlots === undefined) {
      TranscriptionEditor.blockBlots = []
    }
    theBlot.blotName = options.name
    if (options.className === undefined) {
      options.className = options.name
    }
    theBlot.className = options.className
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
    TranscriptionEditor.formatBlots.push(options)
    Quill.register(theBlot)
  }
  
  static init(baseUrl)
  {
    TranscriptionEditor.editors = [] // ??? I don't think this is needed anymore
    TranscriptionEditor.baseUrl = baseUrl
    TranscriptionEditor.registerEvent('editor-enable')
    TranscriptionEditor.registerEvent('editor-disable')
    TranscriptionEditor.registerEvent('editor-save')
    TranscriptionEditor.registerEvent('editor-reset')
    TranscriptionEditor.editorTemplate = Twig.twig({
      id: 'editor',
      data: `
<div class="transcription-editor">
  <div id="editor-controls-{{id}}" class="editor-controlbar">
      <button id="zoom-in-button-{{id}}" title="Make text bigger"><i class="fa fa-search-plus"></i></button>
      <button id="zoom-out-button-{{id}}" title="Make text smaller"><i class="fa fa-search-minus"></i></button>
      <button id="toggle-button-{{id}}" title="Edit"><i class="fa fa-pencil"></i></button>
      <button id="save-button-{{id}}" title="Save changes"><i class="fa fa-save"></i></button>
      <button id="reset-button-{{id}}" title="Revert to last saved changes"><i class="fa fa-refresh"></i></button>
  </div>
  <div class="toolbar" id="toolbar-{{id}}">
        <button id="clear-button-{{id}}" class="selFmtBtn" title="Clear formatting" disabled><i class="fa fa-eraser"></i></button>
        <button id="edit-button-{{id}}" class="selFmtBtn" title="Edit" disabled><i class="fa fa-pencil"></i></button>
        <span id="langButtons-{{id}}"></span>
        <span id="simpleFormatButtons-{{id}}"></span>

        <button id="note-button-{{id}}" title="Editorial Note"><i class="fa fa-comment-o"></i></button>

        <button id="sic-button-{{id}}" class="selFmtBtn" title="Sic" disabled><i class="fa fa-frown-o"></i></button>
        <button id="abbr-button-{{id}}" class="selFmtBtn" title="Abbreviation" disabled><i class="fa fa-hand-spock-o"></i></button>
        
        <span class="dropdown">
            <button id="add-button-{{id}}" class="selFmtBtn" title="Addition" disabled data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                <i class="fa fa-plus-square"></i>
            </button>
            <ul class="dropdown-menu" aria-labelledby="add-button-{{id}}">
                <li><a>Placement</a></li>
                <li role=separator class=divider>
                <li><a id="add-above-{{id}}">Above</a></li>
                <li><a id="add-below-{{id}}">Below</a></li>
                <li><a id="add-inline-{{id}}">Inline</a></li>
                <li><a id="add-inspace-{{id}}">In Space</a></li>
                <li><a id="add-overflow-{{id}}">Overflow</a></li>
                <li><a id="add-marginleft-{{id}}">Margin Left</a></li>
                <li><a id="add-marginright-{{id}}">Margin Right</a></li>
           </ul>
        </span>
         <span class="dropdown">
            <button id="del-button-{{id}}" class="selFmtBtn" title="Deletion" disabled data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                <i class="fa fa-minus-square"></i>
           </button>
            <ul class="dropdown-menu" aria-labelledby="del-button-{{id}}">
                <li><a>Deletion Technique</a></li>
                <li role=separator class=divider>
                <li><a id="del-strikeout-{{id}}">Strikeout</a></li>
                <li><a id="del-dot-above-{{id}}">Single dot above</a></li>
                <li><a id="del-dots-above-{{id}}">Dots above</a></li>
                <li><a id="del-dots-underneath-{{id}}">Dots under</a></li>
                <li><a id="del-dot-above-dot-under-{{id}}">Dot above and under</a></li>
                <li><a id="del-line-above-{{id}}">Line above</a></li>
                <li><a id="del-no-sign-{{id}}">No sign</a></li>
           </ul>
        </span>
        
        <button id="unclear-button-{{id}}" class="selFmtBtn" title="Unclear" disabled><i class="fa fa-low-vision"></i></button>
        <button id="illegible-button-{{id}}"  title="Illegible"><i class="fa fa-eye-slash"></i></button>
        <button id="chunk-start-button-{{id}}"  title="Chunk Start">{</button>
        <button id="chunk-end-button-{{id}}"  title="Chunk End">}</button>
        
        <button id="chgap-button-{{id}}" title="Character gap"><i class="fa fa-square-o"></i></button>
        <button id="pmark-button-{{id}}" title="Paragraph Mark">¶</button>
        
        
        <button class="title-button" disabled>&nbsp;</button>
        {#Special characters#}
        <button id="nowb-button-{{id}}" title="Non word-breaking dash"><i class="fa fa-minus"></i></button>
        <button id="pcircledot-button-{{id}}" title="Circle dot">⊙</button>
        
        <button class="title-button" disabled>&nbsp;</button>
      
        {#Elements#}
        <button id="line-button-{{id}}" title="Line">L</button>
      
        <span id="simpleBlockButtons-{{id}}"></span>
      
        <span class="dropdown">
            <button id="gloss-button-{{id}}" title="Marginal Gloss" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                G
           </button>
            <ul class="dropdown-menu" aria-labelledby="gloss-button-{{id}}">
                <li><a>Placement</a></li>
                <li role=separator class=divider>
                <li><a id="gloss-top-{{id}}">Margin Top</a></li>
                <li><a id="gloss-bottom-{{id}}">Margin Bottom</a></li>
                <li><a id="gloss-left-{{id}}">Margin Left</a></li>
                <li><a id="gloss-right-{{id}}">Margin Right</a></li>
           </ul>
        </span>    
        <button id="linegap-button-{{id}}" title="Line Gap">Gap</button>
        
        <button class="title-button" disabled>Default:</button>
        <span class="dropdown">
            <button class="dropdown-toggle" type="button" id="lang-button-{{id}}" title="Latin" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                la
           </button>
            <ul class="dropdown-menu" id="set-lang-dd-menu-{{id}}" aria-labelledby="lang-button-{{id}}">
           </ul>
        </span>
    </div>
    <div id="editor-container-{{id}}" class="editor-container"></div>
    <div id="status-bar-{{id}}" class="editor-statusbar">
    </div>
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

