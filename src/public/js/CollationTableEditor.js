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

class CollationTableEditor {
  collationTable;

  constructor(options) {

    let optionsDefinition = {
      collationTableData : { type: 'object', required: true},
      workId : { type: 'string', required: true},
      chunkNumber: {type: 'NonZeroNumber', required: true},
      tableId: { type: 'NonZeroNumber', required: true},
      langDef : { type: 'object', default: {
          la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3, editionFont: 'Times New Roman'},
          ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3, editionFont: 'ApmNotoNaskhArabicUI'},
          he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3, editionFont: 'Times New Roman'}
        }
      },
      availableWitnesses: { type: 'Array', default: [] },
      urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true},
      workInfo: { type: 'object', default: {} },
      peopleInfo: { type: 'object', default: {} },
      docInfo: { type: 'object', default: {} },
      versionInfo: { type: 'object', default: {}}
    }

    let oc = new OptionsChecker(optionsDefinition, "EditCollationTable")
    this.options = oc.getCleanOptions(options)

    // icons
    this.icons = {
      moveUp: '&#x1f861;',
      moveDown: '&#x1f863;'
    }

    this.rtlClass = 'rtltext'
    this.ltrClass = 'ltrtext'

    this.apiSaveCollationUrl = this.options.urlGenerator.apiSaveCollation()

    this.ctData = this.options['collationTableData']
    // use default ordering if ctData does not have one
    if (this.ctData['witnessOrder'] === undefined) {
      this.ctData['witnessOrder'] = []
      for(let i=0; i < this.ctData['witnesses'].length; i++) {
        this.ctData['witnessOrder'][i] = i
      }
    }

    this.lastSavedCtData = ApmUtil.deepCopy(this.ctData)
    this.tableId = this.options['tableId']
    this.ctData['tableId'] = this.tableId
    this.versionInfo = this.options.versionInfo
    this.aggregatedNonTokenItemIndexes = this.calculateAggregatedNonTokenItemIndexes()
    this.resetTokenDataCache()

    // DOM elements
    this.ctTitleDiv = $('#collationtabletitle')
    this.ctTitleEditButton = $('#cttitleedit')

    this.ctInfoDiv = $('#collationtableinfo')
    this.breadcrumbCtTitleSpan = $('#breadcrumb-cttitle')
    this.witnessesDivSelector = '#witnessesdiv'
    this.witnessesDiv = $(this.witnessesDivSelector)
    this.versionInfoDiv = $('#versionhistorydiv')
    this.ctDivId = 'collationtablediv'
    this.ctDiv = $('#' + this.ctDivId)
    this.quickEditionDiv = $('#editiondiv')
    this.saveButton = $('#savebutton')
    this.lastSaveSpan = $('#lastSave')
    this.exportCsvButton = $('#export-csv-button')

    let thisObject = this

    this.titleField = new EditableTextField({
      containerSelector: '#cttitletext',
      initialText: this.ctData['title'],
      onConfirm: this.genOnConfirmTitleField()
    })


    this.breadcrumbCtTitleSpan.html("Saved Collation Table")

    this.ctInfoDiv.html(this.genCtInfoDiv())

    this.updateWitnessInfoDiv()
    this.updateVersionInfo()
    this.quickEditionDiv.html('Quick edition coming soon...')
    this.ctDiv.html('Collation table coming soon...')

    this.saveButton.on('click', this.genOnClickSaveButton())

    this.textDirection = this.options.langDef[this.ctData['lang']].rtl ? 'rtl' : 'ltr'

    // viewSettings
    this.viewSettings = {
      highlightVariants: true,
      showNormalizations: false
    }

    // popovers for collation table
    this.setUpPopovers()
    this.popoversOn()

    this.popoversToggle = new NiceToggle({
      containerSelector: '#popovers-toggle',
      title: 'Popovers: ',
      onIcon: '<i class="fas fa-toggle-on"></i>',
      offIcon: '<i class="fas fa-toggle-off"></i>'
    })
    this.popoversToggle.on('toggle', function (ev) {
      if (ev.detail.toggleStatus) {
        thisObject.popoversOn()
      } else {
        thisObject.popoversOff()
      }
    })

    // text direction for collation table div

    if (this.options.langDef[this.ctData['lang']].rtl) {
      this.ctDiv.removeClass(this.ltrClass)
      this.ctDiv.addClass(this.rtlClass)
    } else {
      this.ctDiv.removeClass(this.rtlClass)
      this.ctDiv.addClass(this.ltrClass)
    }


    this.setupTableEditor()
    this.updateSaveArea()
    this.setCsvDownloadFile()
    this.fetchQuickEdition()
  }

  setUpPopovers() {
    this.ctDiv.popover({
      trigger: "hover",
      selector: '.withpopover',
      delay: {show: 500 , hide:0},
      placement: "auto top",
      html: true,
      container: 'body',
      content: this.genPopoverContentFunction()
    })
  }

  genPopoverContentFunction() {
    let thisObject = this
    return function() {
      if (!thisObject.popoversAreOn) {
        return ''
      }

      let cellIndex = thisObject.tableEditor.getCellIndexFromElement($(this))
      if (cellIndex === null) {
        console.error('Popover requested on a non-cell element!')
      }
      let witnessIndex = thisObject.ctData['witnessOrder'][cellIndex.row]
      let tokenIndex = thisObject.tableEditor.getValue(cellIndex.row, cellIndex.col)
      return thisObject.getPopoverHtml(witnessIndex, tokenIndex, cellIndex.col)
    }

  }

  popoversOn() {
    this.popoversAreOn = true
    // this.ctDiv.popover({
    //   trigger: "hover",
    //   selector: '.withpopover',
    //   delay: {show: 500 , hide:0},
    //   placement: "auto top",
    //   html: true,
    //   container: 'body'
    // })
  }

  popoversOff() {
    this.popoversAreOn = false
    // this.ctDiv.popover('destroy')
  }


  getCollationMatrixFromTableEditor() {
    let matrix = this.tableEditor.getMatrix()
    let cMatrix = []
    for(let row = 0; row < matrix.nRows; row++) {
      let witnessIndex = this.ctData['witnessOrder'][row]
      cMatrix[witnessIndex] = []
      for (let col =0; col < matrix.nCols; col++) {
        cMatrix[witnessIndex][col] = matrix.getValue(row, col)
      }
    }
    return cMatrix
  }

  setupTableEditor() {

    let collationTable = this.ctData
    let rowDefinition = []
    for (let i = 0; i < collationTable['witnessOrder'].length; i++) {
      let wIndex = collationTable['witnessOrder'][i]
      let title = collationTable['witnessTitles'][wIndex]
      let tokenArray = collationTable['collationMatrix'][wIndex]
      rowDefinition.push({
        title: title,
        values: tokenArray,
        isEditable: false
      })
    }

    this.tableEditor = new TableEditor({
      id: this.ctDivId,
      textDirection: this.textDirection,
      redrawOnCellShift: false,
      showInMultipleRows: true,
      columnsPerRow: 15, // TODO: change this
      rowDefinition: rowDefinition,
      drawTableInConstructor: false,
      getEmptyValue: function() { return -1},
      isEmptyValue: function(value) { return value === -1},
      generateCellContent: this.genGenerateCellContentFunction(),
      generateTableClasses: this.genGenerateTableClassesFunction(),
      generateCellClasses: this.genGenerateCellClassesFunction(),
      //generateCellTdExtraAttributes: this.genGenerateCellTdExtraAttributesFunction()
    })
    this.variantsMatrix = null // will be calculated before table draw

    let thisObject = this

    // hide popovers before moving cells
    this.tableEditor.on('cell-pre-shift', function(data){
      for(const selector of data.detail.selectors) {
        $(selector).popover('hide')
      }
    })

    // recalculte variants before redrawing the table
    this.tableEditor.on('table-drawn-pre', function () {
      thisObject.recalculateVariants()
    })
    // recalculate variants on cell shifts
    this.tableEditor.on('cell-post-shift',function(data) {
      // let profiler = new SimpleProfiler('CellPostShiftEventHandler')
      let direction = data.detail.direction
      let numCols = data.detail.numCols
      let firstCol = data.detail.firstCol
      let lastCol = data.detail.lastCol
      let theRow = data.detail.row
      //console.log(`Post move ${direction} from ${firstCol} to ${lastCol}, ${numCols} column(s)`)
      //console.log('recalculating variants')
      thisObject.recalculateVariants()
      // profiler.lap('variants recalculated')

      let firstColToRedraw = direction === 'right' ? firstCol : firstCol-numCols
      let lastColToRedraw = direction === 'right' ? lastCol+numCols : lastCol

      for (let col = firstColToRedraw; col <= lastColToRedraw; col++) {
        //thisObject.tableEditor.refreshColumn(col)
        for (let row = 0; row < thisObject.variantsMatrix.nRows; row++) {
          if (row === theRow) {
            thisObject.tableEditor.refreshCell(row, col)
          } else {
            thisObject.tableEditor.refreshCellClasses(row, col)
          }
          //profiler.lap(`row ${row} refreshed`)
        }
        // profiler.lap(`col ${col} refreshed`)
      }
      // profiler.stop()
    })

    this.tableEditor.editModeOn(false)
    this.tableEditor.redrawTable()
    this.tableEditor.on('column-add column-delete cell-shift', this.genOnCollationChanges())
  }

  recalculateVariants() {
    this.variantsMatrix = CollationTableUtil.genVariantsMatrix(this.tableEditor.getMatrix(),
      this.ctData['witnesses'], this.ctData['witnessOrder'])
  }

  genOnCollationChanges() {
    let thisObject = this
    return function() {
      // delay this a bit to make changes a bit more responsive
      window.setTimeout(function(){
        //console.log('collation change')
        thisObject.updateSaveArea()
        thisObject.ctData['collationMatrix'] = thisObject.getCollationMatrixFromTableEditor()
        thisObject.setCsvDownloadFile()
        thisObject.fetchQuickEdition()
      }, 50)
    }
  }

  getPopoverHtml(witnessIndex, tokenIndex, col) {
    if (tokenIndex === -1) {
      return ''
    }

    let popoverHtml  = this.getPopoverHtmlFromCache(witnessIndex, tokenIndex)
    if (popoverHtml !== undefined) {
      //console.log(`Popover cache hit for tableRow ${tableRow}, row ${row}, col ${col}, tokenRef ${value}`)
      return popoverHtml
    }
    //console.log(`Popover cache miss for tableRow ${tableRow}, row ${row}, col ${col}, tokenRef ${value}`)

    let collationTable = this.ctData
    let peopleInfo = this.options.peopleInfo
    let witness = collationTable['witnesses'][witnessIndex]
    let tokenArray = witness['tokens']
    let token = tokenArray[tokenIndex]
    let firstSourceItemIndex = token['sourceItems'][0]['index']
    let lang = witness['lang']
    if (witness['items'][firstSourceItemIndex]['lang'] !== undefined) {
      lang = witness['items'][firstSourceItemIndex]['lang']
    }
    // console.log("Lang: " + lang)
    let langClass = 'popover-' + lang
    popoverHtml = ''
    popoverHtml += '<p class="popoverheading ' + langClass + '">' + token.text
    if (token['normalizedText'] !== undefined) {
      popoverHtml += '<br/>&equiv; ' + token['normalizedText'] + '<br/>'
    }
    popoverHtml += '</p>'
    popoverHtml += '<p class="popoveriteminfo ' + langClass + '">'
    if (token['sourceItems'].length === 1) {
      popoverHtml += this.getItemPopoverHtmlForToken(witnessIndex, token,token['sourceItems'][0], peopleInfo, false)
    } else {
      for (const itemData of token['sourceItems']) {
        popoverHtml += this.getItemPopoverHtmlForToken(witnessIndex, token, itemData, peopleInfo, true)
      }
    }
    popoverHtml += '</p>'

    popoverHtml += '<p class="popovertokenaddress">'
    popoverHtml += this.getTokenAddressHtml(witnessIndex, token)
    popoverHtml += '</p>'

    let postNotes = this.getPostNotes(witnessIndex, col, tokenIndex)
    if (postNotes.length > 0) {
      popoverHtml += '<p class="popoverpostnotes">'
      popoverHtml += '<b>Notes:</b><br/>'
      popoverHtml += this.getNotesHtml(postNotes, peopleInfo)
      popoverHtml += '</p>'
    }

    this.storePopoverHtmlInCache(witnessIndex, tokenIndex, popoverHtml)
    return popoverHtml
  }

  genGenerateCellTdExtraAttributesFunction() {
    let thisObject = this
    return function(tableRow, col, value) {
      if (value === -1) {
        return []
      }
      let witnessIndex = thisObject.ctData['witnessOrder'][tableRow]
      return [ {attr: 'data-content', val : thisObject.getPopoverHtml(witnessIndex, value, col) }]
    }
  }

  getPopoverHtmlFromCache(witnessIndex, tokenIndex) {
    return this.getDataFieldFromTokenDataCache('popoverHtml', witnessIndex, tokenIndex)
  }

  storePopoverHtmlInCache(witnessIndex, tokenIndex, popoverHtml){
    this.storeDataFieldInTokenDataCache('popoverHtml', witnessIndex, tokenIndex, popoverHtml)
  }

  resetTokenDataCache() {
    this.tokenDataCache = {}
  }

  getDataFieldFromTokenDataCache(fieldName, witnessIndex, tokenIndex) {
    if (this.tokenDataCache[witnessIndex] !== undefined && this.tokenDataCache[witnessIndex][tokenIndex] !== undefined) {
      return this.tokenDataCache[witnessIndex][tokenIndex][fieldName]
    }
    return undefined
  }

  storeDataFieldInTokenDataCache(fieldName, witnessIndex, tokenIndex, data) {
    if (this.tokenDataCache[witnessIndex] === undefined) {
      this.tokenDataCache[witnessIndex] = {}

    }
    if (this.tokenDataCache[witnessIndex][tokenIndex] === undefined) {
      this.tokenDataCache[witnessIndex][tokenIndex] = {}
    }
    this.tokenDataCache[witnessIndex][tokenIndex][fieldName] = data
  }



  getNotesHtml(notes, peopleInfo) {
    let html = ''
    let lineBreakHtml = '<br/>'
    let oneIndentUnit = '&nbsp;&nbsp;'
    for(const note of notes) {
      html +=  oneIndentUnit + note.text + lineBreakHtml
      html +=  oneIndentUnit + '<span class="authorinfo">-- ' +
        peopleInfo[note.authorId]['fullname']  + ', ' + this.formatNoteTime(note.timeStamp)  +
        "</span>" + lineBreakHtml
      html += lineBreakHtml
    }
    return html
  }

  // formatDateTime(sqlDateTimeString) {
  //   return moment(sqlDateTimeString).format('D MMM YYYY, H:mm:ss')
  // }

  formatNoteTime(timeStamp) {
    return moment(timeStamp).format('D MMM YYYY, H:mm')
  }

  aggregateNonTokenItemIndexes(witnessData, tokenRefArray) {
    let rawNonTokenItemIndexes = witnessData['nonTokenItemIndexes']
    let numTokens = witnessData['tokens'].length

    let resultingArray = []

    // aggregate post
    let aggregatedPost = []
    for (let i = numTokens -1; i >= 0; i--) {
      let tokenPost = []
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i]['post'] !== undefined) {
        tokenPost = rawNonTokenItemIndexes[i]['post']
      }
      aggregatedPost = aggregatedPost.concat(tokenPost)
      let tokenIndexRef = tokenRefArray.indexOf(i)
      if (tokenIndexRef !== -1) {
        // token i is in the collation table!
        resultingArray[i] = { post: aggregatedPost }
        aggregatedPost = []
      }
    }

    // aggregate pre
    let aggregatedPre = []
    for (let i = 0; i < numTokens; i++ ) {
      let tokenPre = []
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i]['pre'] !== undefined) {
        tokenPre = rawNonTokenItemIndexes[i]['pre']
      }
      aggregatedPre = aggregatedPre.concat(tokenPre)
      let tokenIndexRef = tokenRefArray.indexOf(i)
      if (tokenIndexRef !== -1) {
        // token i is in the collation table!
        resultingArray[i]['pre'] = aggregatedPre
        aggregatedPre = []
      }
    }
    return resultingArray
  }


  calculateAggregatedNonTokenItemIndexes() {
    let indexes = []
    for (let witnessIndex = 0; witnessIndex < this.ctData['witnesses'].length; witnessIndex++) {
      let tokenRefs = this.ctData['collationMatrix'][witnessIndex]
      let witness = this.ctData['witnesses'][witnessIndex]
      indexes[witnessIndex] = this.aggregateNonTokenItemIndexes(witness, tokenRefs)
    }

    return indexes
  }

  getPostNotes(row, col, tokenIndex) {

    let postItemIndexes = this.aggregatedNonTokenItemIndexes[row][tokenIndex]['post']
    let itemWithAddressArray = this.ctData['witnesses'][row]['items']
    let notes = []
    for(const itemIndex of postItemIndexes) {
      let theItem = itemWithAddressArray[itemIndex]
      let itemNotes = []
      if (theItem['notes'] !== undefined) {
        itemNotes = theItem['notes']
      }
      for(const note of itemNotes) {
        notes.push(note)
      }
    }
    return notes
  }

  getItemPopoverHtmlForToken(row, token, tokenSourceItemData, peopleInfo, showItemText = false) {
    let popoverHeadingClass = 'popoverheading'
    let unclearIcon = ' <i class="far fa-eye-slash" aria-hidden="true"></i> '
    let deletionIcon = ' &lowast; '
    let locationIcon = ' <i class="fas fa-location-arrow" aria-hidden="true"></i> '
    let oneIndentUnit = '&nbsp;&nbsp;'
    let lineBreakHtml = '<br/>'
    let itemBullet = ''
    let normalizationLabels = {
      'sic' : 'Sic',
      'abbr' : 'Abbreviation'
    }
    let itemWithAddressArray = this.ctData['witnesses'][row]['items']
    let item = itemWithAddressArray[tokenSourceItemData['index']]
    let tokenItemText = ''
    if (item['text'] !== undefined) {
      tokenItemText = item['text'].substring(tokenSourceItemData['charRange'].from, tokenSourceItemData['charRange'].to+1)
    }
    if (item.type !== 'TextualItem') {
      return ''
    }
    if (tokenItemText === "\n") {
      return ''
    }

    let html = ''
    let indentHtml = ''
    if (showItemText) {
      html += itemBullet + tokenItemText + lineBreakHtml
      indentHtml = oneIndentUnit
    }
    let isNormalText = true
    if (item.hand !== undefined) {
      html += indentHtml + '<b>Hand: </b>' + (item.hand +1) + lineBreakHtml
    }
    if (item.format !== undefined) {
      html += indentHtml + '<b>Format: </b>' + item.format + lineBreakHtml
      isNormalText = false
    }
    if (item['clarity'] === 0) {
      html += indentHtml + '<b>Illegible</b>' + lineBreakHtml
      html += indentHtml + unclearIcon + item['clarityReason']
      isNormalText = false
    }
    if (item['clarity'] === 0.5) {
      html += indentHtml + '<b>Unclear</b>' + lineBreakHtml
      html += indentHtml + unclearIcon + item['clarityReason']
      isNormalText = false
    }
    if (item['textualFlow'] === 1) {
      html += indentHtml + '<b>Addition</b>'+ lineBreakHtml
      html += indentHtml + locationIcon + item.location
      isNormalText = false
    }
    if (item.deletion !== undefined) {
      html += indentHtml + '<b>Deletion</b>'+ lineBreakHtml
      html += indentHtml + deletionIcon + item.deletion
      isNormalText = false
    }
    if (item['normalizationType'] !== undefined) {
      let normLabel = item['normalizationType']
      if (normalizationLabels[item['normalizationType']] !== undefined) {
        normLabel = normalizationLabels[item['normalizationType']]
      }

      html += indentHtml +  '<b>' + normLabel + '</b>' + lineBreakHtml
      html += '+ ' + tokenItemText + lineBreakHtml
      if (token['normalizedText'] === tokenItemText) {
        html += '= ' + '(no reading given)'
      } else {
        html += '= ' + token['normalizedText']
      }

      isNormalText = false
    }
    if (isNormalText) {
      html += indentHtml + 'Normal Text'+ lineBreakHtml
    }
    html += lineBreakHtml

    // notes
    if (item['notes'] !== undefined && item['notes'].length > 0) {
      html += indentHtml + '<b>Notes</b>' + lineBreakHtml
      html += this.getNotesHtml(item['notes'], peopleInfo)
    }

    return html

  }

  getTokenAddressHtml(row, token) {
    let html = ''
    let itemWithAddressArray = this.ctData['witnesses'][row]['items']
    let itemData = token['sourceItems'][0]
    let itemWithAddress = itemWithAddressArray[itemData['index']]

    let page = itemWithAddress['address'].foliation
    let column = 0
    if (typeof(token['textBox']) === 'number') {
      column = token['textBox']
    } else {
      console.info('Found a token with a textBox range in row ' + row)
      console.log(token)
      column = token['textBox'].from
    }
    let line = ''
    if (column > 10) {
      // this is a marginal really
      column = 'margin'
    } else {
      if (typeof(token.line) === 'number') {
        line = token.line
      } else {
        line = token.line.from + '-' + token.line.to
      }
    }

    html += '<b>Page: </b>' + page + '</br>'
    html += '<b>Column: </b>' + column + '</br>'
    if (line !== -1) {
      html += '<b>Line: </b>' + line + '</br>'
    }

    return html
  }

  genGenerateCellClassesFunction() {
    let thisObject = this
    return function(tableRow, col, value) {
      if (value === -1) {
        return [ 'emptytoken']
      }
      let witnessIndex = thisObject.ctData['witnessOrder'][tableRow]
      let tokenArray = thisObject.ctData['witnesses'][witnessIndex]['tokens']
      let itemWithAddressArray = thisObject.ctData['witnesses'][witnessIndex]['items']

      let token = tokenArray[value]

      let classes = thisObject.getTokenClasses(token)
      // popoverclass
      classes.push('withpopover')
      //variant class
      if (thisObject.viewSettings.highlightVariants) {
        // Note that the variantsMatrix refers to the tableRow not to the witness row
        classes.push('variant_' + thisObject.variantsMatrix.getValue(tableRow, col))
      }
      // get itemZero
      let itemZeroIndex = token['sourceItems'][0]['index']
      let itemZero = itemWithAddressArray[itemZeroIndex]

      // language class
      let lang = thisObject.ctData['witnesses'][witnessIndex]['lang']
      if (itemZero['lang'] !== undefined) {
        lang = itemZero['lang']
      }
      classes.push( lang + '-td')
      if (token['sourceItems'].length === 1) {
        // td inherits the classes from the single source item
        return classes.concat(thisObject.getClassesFromItem(itemZero))
      }
      return classes
    }
  }

  getTokenClasses(token) {
    let classes = []
    classes.push('tokentype_' + token.tokenType)
    return classes
  }

  genGenerateTableClassesFunction() {
    let thisObject = this
    return function() {
      let langCode = thisObject.ctData['lang']
      return [ ('te-table-' + langCode) ]
    }
  }

  genGenerateCellContentFunction() {
    let thisObject = this
    let noteIconSpan = ' <span class="noteicon"><i class="far fa-comment"></i></span>'
    let normalizationSymbol = '<b><sub>N</sub></b>'
    return function(tableRow, col, value) {
      //let profiler = new SimpleProfiler(`cc-tr${tableRow}-c${col}-v${value}`)
      if (value === -1) {
        return '&mdash;'
      }

      let witnessIndex = thisObject.ctData['witnessOrder'][tableRow]

      let cellCachedContent = thisObject.getDataFieldFromTokenDataCache('cellContent', witnessIndex, value)
      if (cellCachedContent !== undefined) {
        //profiler.lap('cache hit')
        return cellCachedContent
      }

      let tokenArray = thisObject.ctData['witnesses'][witnessIndex]['tokens']
      let token = tokenArray[value]
      let postNotes = thisObject.getPostNotes(witnessIndex, col, value)
      if (token['sourceItems'].length === 1 && postNotes.length === 0) {
        if (thisObject.viewSettings.showNormalizations && token['normalizedText'] !== undefined) {
          return token['normalizedText'] + normalizationSymbol
        }
        //thisObject.storeDataFieldInTokenDataCache('cellContent', witnessIndex, value, token.text)
        return token.text
      }
      // spans for different items
      let itemWithAddressArray = thisObject.ctData['witnesses'][witnessIndex]['items']
      let cellHtml = ''
      for (const itemData of token['sourceItems']) {
        let theItem = itemWithAddressArray[itemData['index']]
        let itemText = ''
        if (theItem['text'] !== undefined) {
          itemText = theItem['text'].substring(itemData['charRange'].from, itemData['charRange'].to + 1)
        }
        if (theItem.type === 'TextualItem' && itemText!== "\n") {
          cellHtml += '<span class="' + thisObject.getClassesFromItem(theItem).join(' ') + '">'
          // TODO: check to see if this is a bug in itemization! see I-DE-BER-SB-4o.Inc.4619, AW47-47
          // filter out leading new lines
          let theText = itemText.replace(/^\n/, '')
          cellHtml += theText
          cellHtml += '</span>'
        }
      }
      // if there are notes after the token, put the note icon

      if (postNotes.length > 0) {
        cellHtml += noteIconSpan
      }

      thisObject.storeDataFieldInTokenDataCache('cellContent', witnessIndex, value, cellHtml)
      //profiler.lap('Cache miss')
      return cellHtml
    }
  }

  getClassesFromItem(item) {
    let classes = []
    let hand = 0
    if (item.hand !== undefined) {
      hand = item.hand
    }
    classes.push( 'hand_' + hand)

    if (item.format !== undefined && item.format !== '') {
      classes.push(item.format)
    }
    if (item['clarity'] !== undefined && item['clarity'] !== 1) {
      classes.push('unclear')
    }
    if (item['textualFlow']!== undefined && item['textualFlow'] === 1) {
      classes.push('addition')
    }
    if (item.deletion !== undefined && item.deletion !== '') {
      classes.push('deletion')
    }
    if (item['normalizationType'] !== undefined && item['normalizationType'] !== '') {
      classes.push(item['normalizationType'])
    }
    return classes
  }

  updateVersionInfo(){
    let html = ''

    html += '<table class="versioninfo">'
    html += '<tr><th>N</th><th>Id</th><th>Author</th><th>Time</th><th>Description</th></tr>'

    for(let i=this.versionInfo.length-1; i >= 0; i--)   {
      let version = this.versionInfo[i]
      html += '<tr>'
      html += '<td>' + (i+1) + '</td>'
      html += '<td>' + version['id'] + '</td>'
      html += '<td>' + this.options.peopleInfo[version['authorId']].fullname + '</td>'
      html += '<td>' + ApmUtil.formatVersionTime(version['timeFrom']) + '</td>'
      html += '<td>' + version['description'] + '</td>'

      html += '<td>'
      if (version['isMinor']) { html += '[m]'}
      if (version['isReview']) { html += ' [r]'}
        html += '</td>'
      html += '</tr>'
    }

    this.versionInfoDiv.html(html)
  }

  genOnClickSaveButton() {
    let thisObject = this
    return function() {
      let changes = thisObject.changesInCtData()
      if (changes.length !== 0) {
        thisObject.saveButton.popover('hide')
        thisObject.saveButton.html('Saving...')
        console.log('Saving table via API call to ' + thisObject.apiSaveCollationUrl)
        let description = ''
        for (let change of changes) {
          description += change + '. '
        }
        thisObject.ctData['collationMatrix'] = thisObject.getCollationMatrixFromTableEditor()
        let apiCallOptions = {
          collationTableId: thisObject.tableId,
          collationTable: thisObject.ctData,
          descr: description,
          source: 'edit',
          baseSiglum: thisObject.ctData['sigla'][0]
        }
        $.post(
          thisObject.apiSaveCollationUrl,
          {data: JSON.stringify(apiCallOptions)}
        ).done( function (apiResponse){
          console.log("Success saving table")
          console.log(apiResponse)
          thisObject.lastSavedCtData = ApmUtil.deepCopy(thisObject.ctData)
          thisObject.lastSavedEditorMatrix = thisObject.tableEditor.getMatrix().clone()
          thisObject.versionInfo = apiResponse.versionInfo
          thisObject.updateSaveArea()
          thisObject.updateVersionInfo()
          thisObject.fetchQuickEdition()
        }).fail(function(resp){
          console.error("Cannot save table")
          console.log(resp)
        })
      }
    }
  }

  updateWitnessInfoDiv() {
    // Turn off current event handlers
    $(this.witnessesDivSelector + ' .move-up-btn').off()
    $(this.witnessesDivSelector + ' .move-down-btn').off()

    // set Html in container
    this.witnessesDiv.html(this.genWitnessesDivHtml())

    // set up witness move buttons
    $(this.witnessesDivSelector + ' td.witnesspos-0 > .move-up-btn').addClass('disabled').addClass('opacity-0')
    let lastPos = this.ctData['witnessOrder'].length -1
    $(this.witnessesDivSelector + ' td.witnesspos-' + lastPos +  ' > .move-down-btn').addClass('disabled').addClass('opacity-0')
    $(this.witnessesDivSelector + ' .move-up-btn').on('click', this.genOnClickUpDownWitnessInfoButton('up'))
    $(this.witnessesDivSelector + ' .move-down-btn').on('click',this.genOnClickUpDownWitnessInfoButton('down') )

    // set up siglum editors
    for (let i = 0; i < this.ctData['witnesses'].length; i++) {
      let siglumEditor = new EditableTextField({
        containerSelector:  this.witnessesDivSelector + ' .siglum-' + i,
        initialText: this.ctData['sigla'][i],
        onConfirm: this.genOnConfirmSiglumEdit(i)
      })
    }
  }

  genOnConfirmSiglumEdit(witnessIndex) {
    let thisObject = this
    return function(ev) {
      let newText = ApmUtil.removeWhiteSpace(ev.detail['newText'])
      let oldText = ev.detail['oldText']
      let editor = ev.detail['editor']
      if (oldText === newText || newText === '') {
        // just reset the editor's text in case the edited text contained whitespace
        editor.setText(thisObject.ctData['sigla'][witnessIndex])
        return false
      }
      //console.log('Change in siglum for witness index ' + witnessIndex +  ' to ' + newText)
      if (thisObject.ctData['sigla'].indexOf(newText) !== -1) {
        ApmUtil.transientAlert($(thisObject.witnessesDivSelector + ' .warning-td-' + witnessIndex), '',
          "Given siglum '" + newText + "' already exists, no changes made", 2000, 'slow')
        editor.setText(thisObject.ctData['sigla'][witnessIndex])
      }
      // Change the siglum
      thisObject.ctData['sigla'][witnessIndex] = newText
      thisObject.fetchQuickEdition()
      thisObject.updateSaveArea()

    }
  }


  /**
   * generates the on click function for the witness info move buttons
   * Notice that the direction is from the point of view of the table: moving
   * up in the table means actually moving to an lesser position in the witness
   * order array. The top witness in the table is actually position 0.
   * @param direction
   * @returns {function(...[*]=)}
   */
  genOnClickUpDownWitnessInfoButton(direction) {
    let thisObject = this
    return function(ev) {
      let classes = ApmUtil.getClassArrayFromJQueryObject($(ev.currentTarget.parentNode))
      let index = thisObject.getWitnessIndexFromClasses(classes)
      let position = thisObject.getWitnessPositionFromClasses(classes)
      let numWitnesses = thisObject.ctData['witnesses'].length
      console.log('Click move ' + direction + ' button on witness ' + index + ', position ' + position)


      if (direction === 'down' && position === numWitnesses -1) {
        // at the last position, cannot move up
        console.log('Nowhere to move down the table')
        return false
      }

      if (direction === 'up' && position === 0) {
        // at the first position, cannot move down
        console.log('Nowhere to move up')
        return false
      }

      let indexOffset = direction === 'up' ? -1 : 1

      ApmUtil.arraySwapElements(thisObject.ctData['witnessOrder'],position, position+indexOffset)

      thisObject.witnessesDiv.html('Updating...')
      thisObject.setupTableEditor()
      thisObject.fetchQuickEdition()
      thisObject.updateWitnessInfoDiv()
      thisObject.updateSaveArea()
      thisObject.setCsvDownloadFile()

    }
  }

  getWitnessIndexFromClasses(classes) {
    let index = -1
    for (let i = 0; i < classes.length; i++) {
      let theClass = classes[i]
      if (/^witness-/.test(theClass)) {
        // noinspection TypeScriptValidateTypes
        return parseInt(theClass.split('-')[1])
      }
    }
    return index
  }

  getWitnessPositionFromClasses(classes) {
    let index = -1
    for (let i = 0; i < classes.length; i++) {
      let theClass = classes[i]
      if (/^witnesspos-/.test(theClass)) {
        // noinspection TypeScriptValidateTypes
        return parseInt(theClass.split('-')[1])
      }
    }
    return index
  }

  genWitnessesDivHtml() {
    let html = ''

    html+= '<table class="witnesstable">'
    html+= '<tr><th></th><th>Witness</th><th>Version used</th><th>Siglum</th></tr>'

    for(let i = 0; i < this.ctData['witnessOrder'].length; i++) {
      let wIndex = this.ctData['witnessOrder'][i]
      let witness = this.ctData['witnesses'][wIndex]
      let siglum = this.ctData['sigla'][wIndex]
      let witnessTitle = this.ctData['witnessTitles'][wIndex]
      let witnessClass = 'witness-' + wIndex
      let siglumClass = 'siglum-' + wIndex
      let warningTdClass = 'warning-td-' + wIndex
      witnessClass += ' witnesspos-' + i
      html += '<tr>'

      html += `<td class="${witnessClass} cte-witness-move-td">`

      html += `<span class="btn move-up-btn" title="Move up">${this.icons.moveUp}</span>`
      html += `<span class="btn move-down-btn" title="Move down">${this.icons.moveDown}</span>`
      html += '</td>'

      html += '<td>' + witnessTitle + '</td>'
      html += '<td>' + ApmUtil.formatVersionTime(witness['timeStamp']) + '</td>'
      html += '<td class="' + siglumClass + '">'+ siglum + '</td>'

      html += '<td class="' + warningTdClass + '"></td>'
      html += '</tr>'
    }
    html += '</table>'
    html += '<div class="warning-area-1"></div>'
    return html
  }

  updateSaveArea() {
    let changes = this.changesInCtData()
    if (changes.length !== 0) {
      //console.log('Detected changes in data')
      //console.log(changes)
      this.saveButton.html('Save Changes')
      this.buttonPopoverContent = '<p>'
      this.buttonPopoverContent += '<ul>'
      for (const change of changes){
        this.buttonPopoverContent += '<li>' + change + '</li>'
      }
      this.buttonPopoverContent += '</ul></p>'
      let thisObject = this
      this.saveButton.popover({
        trigger: 'hover',
        placement: 'auto left',
        title: "Click to save changes",
        html: true,
        content: function() { return thisObject.buttonPopoverContent}
      })
      this.saveButton.removeClass('hidden')
    } else {
      //console.log('no changes in data')
      this.saveButton.addClass('hidden')
    }

    let lastVersion = this.versionInfo[this.versionInfo.length-1]
    this.lastSaveSpan.html(ApmUtil.formatVersionTime(lastVersion['timeFrom']))
  }

  changesInCtData() {
    let changes = []
    if (this.ctData['title'] !== this.lastSavedCtData['title']) {
      changes.push("New title: '" + this.ctData['title'] + "'" )
    }
    let currentCollationMatrix = this.getCollationMatrixFromTableEditor()
    if (!CollationTableUtil.collationMatricesAreEqual(currentCollationMatrix, this.lastSavedCtData['collationMatrix'])) {
      changes.push('Changes in collation alignment')
    }

    if (!ApmUtil.arraysAreEqual(this.ctData['witnessOrder'], this.lastSavedCtData['witnessOrder'])) {
      changes.push('New witness order')
    }

    if (!ApmUtil.arraysAreEqual(this.ctData['sigla'], this.lastSavedCtData['sigla'])) {
      changes.push('Changes in sigla')
    }


    return changes
  }



  fetchQuickEdition() {
    let profiler = new SimpleProfiler('FetchQuickEdition')
    this.quickEditionDiv.html("Requesting edition from the server... <i class=\"fa fa-spinner fa-spin fa-fw\"></i>")
    let apiQuickEditionUrl = this.options.urlGenerator.apiAutomaticEdition()
    //console.log('Calling API at ' + apiQuickEditionUrl)
    let apiCallOptions = {
      collationTable: this.ctData,
      baseWitnessIndex: this.ctData['witnessOrder'][0]
    }

    let thisObject = this
    $.post(
      apiQuickEditionUrl,
      {data: JSON.stringify(apiCallOptions)}
    ).done( function (apiResponse) {
      profiler.stop()
      //console.log(apiResponse)

      let ev = new EditionViewer( {
        collationTokens: apiResponse.mainTextTokens,
        apparatusArray: apiResponse.apparatusArray,
        isRightToLeft: (apiResponse.textDirection === 'rtl'),
        fontFamily: thisObject.options.langDef[thisObject.ctData['lang']].editionFont,
        addGlue: false
      })

      thisObject.quickEditionDiv.html(ev.getHtml())

      thisObject.quickEditionDiv.append(thisObject.genEditionEngineRunDetailsHtml(apiResponse['engineRunDetails']))

    }).fail(function(resp) {
      console.error('Error in quick edition')
      console.log(resp)
      let failMsg = 'Error getting quick edition <i class="fa fa-frown-o" aria-hidden="true"></i><br/> '
      failMsg += '<span class="small">HTTP code ' + resp.status + '</span>'
      thisObject.quickEditionDiv.html(failMsg)
    })
  }

  genEditionEngineRunDetailsHtml(runDetails) {
    let html = ''

    html += '<div class="edrundetails">'
    html += 'Engine Name: ' + runDetails['engineName'] + '<br/>'
    html += 'Run Datetime: ' + runDetails['runDateTime']+ '<br/>'
    html += 'Duration: ' +   (runDetails['duration'] * 1000.0).toFixed(2) + ' ms'
    html += '</div>'

    return html
  }

  genOnConfirmTitleField() {
    let thisObject = this
    return function (data) {
      //console.log('confirm title field')
      //console.log(data.detail)
      if (data.detail.newText !== data.detail.oldText) {
        let normalizedNewTitle = thisObject.normalizeTitleString(data.detail.newText)
        if (normalizedNewTitle === '') {
          console.debug('Empty new title')
          thisObject.titleField.setText(thisObject.ctData['title'])
          return false
        }
        //console.debug('New title: ' + normalizedNewTitle)
        thisObject.ctData['title'] = normalizedNewTitle
        thisObject.titleField.setText(normalizedNewTitle)
        thisObject.updateSaveArea()
      }
      return false
    }
  }

  normalizeTitleString(title) {

    return title.replace(/^\s*/, '').replace(/\s*$/, '')

  }

  genCtInfoDiv() {
    let html = ''

    let workTitle = this.options.workInfo['title']
    let workAuthorId = this.options.workInfo['authorId']
    let workAuthorName = this.options.peopleInfo[workAuthorId]['fullname']

    html += '<p>' + workAuthorName + ', <i>' + workTitle + '</i>, chunk ' +  this.options.chunkNumber + '</p>'
    html += '<p>Chunk ID: ' + this.options.workId + '-' + this.options.chunkNumber + '</p>'
    html += '<p>Table ID: ' + this.tableId + '</p>'
    return html
  }

  setCsvDownloadFile() {
    let href = 'data:text/csv,' + encodeURIComponent(this.generateCsv())
    this.exportCsvButton.attr('href', href)
  }

  /**
   * Generates a CSV string from the collation table
   * @returns {string}
   */
  generateCsv() {
    let sep = ','
    let collationTable = this.ctData
    let titles = collationTable['witnessTitles']
    let numWitnesses = collationTable['witnesses'].length
    let collationMatrix = collationTable['collationMatrix']
    let order = collationTable['witnessOrder']

    let output = ''
    for (let i=0; i < numWitnesses; i++) {
      let witnessIndex = order[i]
      let title = titles[witnessIndex]
      output += title + sep
      let ctRefRow = collationMatrix[witnessIndex]
      for (let tkRefIndex = 0; tkRefIndex < ctRefRow.length; tkRefIndex++) {
        let tokenRef = ctRefRow[tkRefIndex]
        let tokenCsvRep = ''
        if (tokenRef !== -1 ) {
          let token = collationTable.witnesses[witnessIndex].tokens[tokenRef]
          tokenCsvRep = this.getCsvRepresentationForToken(token, this.viewSettings.showNormalizations)
        }
        output += tokenCsvRep + sep
      }
      output += "\n"
    }
    return output
  }

  getCsvRepresentationForToken(tkn, showNormalizations) {
    if (tkn.empty) {
      return ''
    }
    let text = tkn.text
    if (showNormalizations) {
      text = tkn.norm
    }
    return '"' + text + '"'
  }





}