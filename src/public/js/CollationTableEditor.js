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

    this.rtlClass = 'rtltext'
    this.ltrClass = 'ltrtext'

    this.apiSaveCollationUrl = this.options.urlGenerator.apiSaveCollation()

    this.ctData = this.options['collationTableData']
    this.lastSavedCtData = $.extend({}, this.ctData)
    this.tableId = this.options['tableId']
    this.ctData['tableId'] = this.tableId
    this.versionInfo = this.options.versionInfo

    this.aggregatedNonTokenItemIndexes = this.calculateAggregatedNonTokenItemIndexes()


    // DOM elements
    this.ctTitleDiv = $('#collationtabletitle')
    this.ctTitleEditButton = $('#cttitleedit')

    this.ctInfoDiv = $('#collationtableinfo')
    //this.ctActionsDiv = $('#collationtableactions')
    this.breadcrumbCtTitleSpan = $('#breadcrumb-cttitle')
    this.witnessesDiv = $('#witnessesdiv')
    this.versionInfoDiv = $('#versionhistorydiv')
    this.ctDivId = 'collationtablediv'
    this.ctDiv = $('#' + this.ctDivId)
    this.quickEditionDiv = $('#editiondiv')
    //this.saveAreaDiv = $('#save-area')
    this.saveButton = $('#savebutton')
    this.lastSaveSpan = $('#lastSave')

    let thisObject = this
    this.ctTitleDiv.on('mouseenter', function () {
      thisObject.ctTitleEditButton.removeClass('hidden')
    })
    this.ctTitleDiv.on('mouseleave', function () {
      thisObject.ctTitleEditButton.addClass('hidden')
    })


    this.titleField = new EditableTextField({
      containerSelector: '#cttitletext',
      initialText: this.ctData['title'],
      onConfirm: this.genOnConfirmTitleField()
    })


    this.breadcrumbCtTitleSpan.html("Saved Collation Table")

    this.ctInfoDiv.html(this.genCtInfoDiv())

    this.witnessesDiv.html(this.genWitnessesDivHtml())
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
    this.ctDiv.popover({
      trigger: "hover",
      selector: '.withpopover',
      delay: {show: 500 , hide:0},
      placement: "auto top",
      html: true,
      container: 'body'
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
    this.lastSavedEditorMatrix = this.tableEditor.getMatrix().clone()
    this.updateSaveArea()
    this.fetchQuickEdition()
  }

  getCollationMatrixFromTableEditor() {
    let matrix = this.tableEditor.getMatrix()
    let cMatrix = []
    for(let row = 0; row < matrix.nRows; row++) {
      cMatrix[row] = []
      for (let col =0; col < matrix.nCols; col++) {
        cMatrix[row][col] = matrix.getValue(row, col)
      }
    }
    return cMatrix
  }

  setupTableEditor() {

    let collationTable = this.ctData
    let rowDefinition = []
    for (let i = 0; i < collationTable['sigla'].length; i++) {
      //let witness = collationTable.witnesses[i]
      let siglum = collationTable['sigla'][i]
      let tokenArray = collationTable['collationMatrix'][i]
      rowDefinition.push({
        title: siglum,
        values: tokenArray,
        isEditable: false
      })
    }

    this.tableEditor = new TableEditor({
      id: this.ctDivId,
      textDirection: this.textDirection,
      showInMultipleRows: true,
      columnsPerRow: 15, // TODO: change this
      rowDefinition: rowDefinition,
      drawTableInConstructor: false,
      getEmptyValue: function() { return -1},
      isEmptyValue: function(value) { return value === -1},
      generateCellContent: this.genGenerateCellContentFunction(),
      generateTableClasses: this.genGenerateTableClassesFunction(),
      generateCellClasses: this.genGenerateCellClassesFunction(),
      generateCellTdExtraAttributes: this.genGenerateCellTdExtraAttributesFunction()
    })
    this.variantsMatrix = null // will be calculated before table draw
    //this.variantsMatrix = this.genVariantsMatrix(this.tableEditor.getMatrix(), collationTable['witnesses'])
    this.tableEditor.on('cell-pre-move', function(data){
      $(data.detail.selector).popover('hide')
    })
    let thisObject = this
    this.tableEditor.on('table-drawn-pre', function () {
        thisObject.variantsMatrix = thisObject.genVariantsMatrix(thisObject.tableEditor.getMatrix(), collationTable['witnesses'])
    })

    this.tableEditor.editModeOn(false)
    this.tableEditor.redrawTable()


    this.tableEditor.on('column-add column-delete cell-move', this.genOnCollationChanges())
  }

  genOnCollationChanges() {
    let thisObject = this
    return function() {
      console.log('collation change')
      thisObject.updateSaveArea()
    }
  }

  genVariantsMatrix(refMatrix, witnesses) {
    let variantMatrix = new Matrix(refMatrix.nRows, refMatrix.nCols)

    for (let col=0; col < refMatrix.nCols; col++) {
      let refCol = refMatrix.getColumn(col)
      let textCol = []
      for(let row=0; row < refMatrix.nRows; row++) {
        let ref = refCol[row]
        if (ref=== -1) {
          textCol.push('')
          continue
        }
        textCol.push(witnesses[row].tokens[ref]['normalizedText'])
      }
      //console.log(textCol)
      let ranks = this.rankVariants(textCol)
      //console.log(ranks)
      for(let row=0; row < refMatrix.nRows; row++) {
        variantMatrix.setValue(row, col, ranks[row])
      }
    }
    return variantMatrix
  }

  rankVariants(stringArray) {
    let countsByString = []
    for(const text of stringArray) {
      if (text === '') {
        continue
      }
      if (countsByString[text] === undefined) {
        countsByString[text] = 1
      } else {
        countsByString[text]++
      }
    }

    let countArray = []

    for(const aKey of Object.keys(countsByString)) {
      countArray.push({ text: aKey, count: countsByString[aKey]})
    }
    countArray.sort(function (a,b) { return b['count'] - a['count']})

    let rankObject = {}
    for(let i = 0; i < countArray.length; i++) {
      rankObject[countArray[i]['text']] = i
    }

    let ranks = []
    for(const text of stringArray) {
      if (text === '') {
        ranks.push(12345678)
        continue
      }
      ranks.push(rankObject[text])
    }
    return ranks
  }

  genGenerateCellTdExtraAttributesFunction() {
    let thisObject = this
    return function(row, col, value) {
      if (value === -1) {
        return ''
      }
      let collationTable = thisObject.ctData
      let peopleInfo = thisObject.options.peopleInfo
      let witness = collationTable['witnesses'][row]
      let tokenArray = witness['tokens']
      let token = tokenArray[value]
      let firstSourceItemIndex = token['sourceItems'][0]['index']
      let lang = witness['lang']
      if (witness['items'][firstSourceItemIndex]['lang'] !== undefined) {
        lang = witness['items'][firstSourceItemIndex]['lang']
      }
      // console.log("Lang: " + lang)
      let langClass = 'popover-' + lang
      let popoverHtml = ''
      popoverHtml += '<p class="popoverheading ' + langClass + '">' + token.text
      if (token['normalizedText'] !== undefined) {
        popoverHtml += '<br/>&equiv; ' + token['normalizedText'] + '<br/>'
      }
      popoverHtml += '</p>'
      popoverHtml += '<p class="popoveriteminfo ' + langClass + '">'
      if (token['sourceItems'].length === 1) {
        popoverHtml += thisObject.getItemPopoverHtmlForToken(row, token,token['sourceItems'][0], peopleInfo, false)
      } else {
        for (const itemData of token['sourceItems']) {
          popoverHtml += thisObject.getItemPopoverHtmlForToken(row, token, itemData, peopleInfo, true)
        }
      }
      popoverHtml += '</p>'

      popoverHtml += '<p class="popovertokenaddress">'
      popoverHtml += thisObject.getTokenAddressHtml(row, token)
      popoverHtml += '</p>'

      let postNotes = thisObject.getPostNotes(row, col, value)
      if (postNotes.length > 0) {
        popoverHtml += '<p class="popoverpostnotes">'
        popoverHtml += '<b>Notes:</b><br/>'
        popoverHtml += thisObject.getNotesHtml(postNotes, peopleInfo)
        popoverHtml += '</p>'
      }

      return 'data-content="' + thisObject.escapeHtml(popoverHtml) + '"'
    }
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
    //console.log('Get post notes: r' + row + ' c' + col + ' i' + tokenIndex)
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
    let additionIcon = ' + '
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
    return function(row, col, value) {
      if (value === -1) {
        return [ 'emptytoken']
      }
      let tokenArray = thisObject.ctData['witnesses'][row]['tokens']
      let itemWithAddressArray = thisObject.ctData['witnesses'][row]['items']

      let token = tokenArray[value]

      let classes = thisObject.getTokenClasses(token)
      // popoverclass
      classes.push('withpopover')
      //variant class
      if (thisObject.viewSettings.highlightVariants) {
        classes.push('variant_' + thisObject.variantsMatrix.getValue(row, col))
      }
      // get itemZero
      let itemZeroIndex = token['sourceItems'][0]['index']
      let itemZero = itemWithAddressArray[itemZeroIndex]

      // language class
      let lang = thisObject.ctData['witnesses'][row]['lang']
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
    return function(row, col, value) {
      if (value === -1) {
        return '&mdash;'
      }
      let tokenArray = thisObject.ctData['witnesses'][row]['tokens']
      let token = tokenArray[value]
      let postNotes = thisObject.getPostNotes(row, col, value)
      if (token['sourceItems'].length === 1 && postNotes.length === 0) {
        if (thisObject.viewSettings.showNormalizations && token['normalizedText'] !== undefined) {
          return token['normalizedText'] + normalizationSymbol
        }
        return token.text
      }
      // spans for different items
      let itemWithAddressArray = thisObject.ctData['witnesses'][row]['items']
      let cellHtml = ''
      for (const itemData of token['sourceItems']) {
        let theItem = itemWithAddressArray[itemData['index']]
        let itemText = ''
        if (theItem['text'] !== undefined) {
          itemText = theItem['text'].substring(itemData['charRange'].from, itemData['charRange'].to + 1)
        }
        if (theItem.type === 'TextualItem' && itemText!== "\n") {
          cellHtml += '<span class="' + thisObject.getClassesFromItem(theItem).join(' ') + '">'
          cellHtml += itemText
          cellHtml += '</span>'
        }
      }
      // if there are notes after the token, put the note icon

      if (postNotes.length > 0) {
        cellHtml += noteIconSpan
      }
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
          thisObject.lastSavedCtData = $.extend({}, thisObject.ctData)
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

  genWitnessesDivHtml() {
    let html = ''

    html+= '<table class="witnesstable">'
    html+= '<tr><th>Witness</th><th>Version used</th><th>Siglum</th></tr>'

    for(let i = 0; i < this.ctData['witnesses'].length; i++) {
      let witness = this.ctData['witnesses'][i]
      let siglum = this.ctData['sigla'][i]
      let docTitle = this.options.docInfo[witness['docId']]['title']
      html += '<tr>'
      html += '<td>' + docTitle + '</td>'
      html += '<td>' + ApmUtil.formatVersionTime(witness['timeStamp']) + '</td>'
      html += '<td>'+ siglum + '</td>'
      html += '</tr>'
    }
    return html
  }

  updateSaveArea() {
    let changes = this.changesInCtData()
    if (changes.length !== 0) {
      this.saveButton.removeClass('hidden')
    } else {
      this.saveButton.addClass('hidden')
    }

    let lastVersion = this.versionInfo[this.versionInfo.length-1]
    this.lastSaveSpan.html(ApmUtil.formatVersionTime(lastVersion['timeFrom']))
  }

  changesInCtData() {
    //console.log('Checking data changes')
    //console.log('Title')
    //console.log(this.ctData['title'])
    //console.log(this.lastSavedCtData['title'])

    let changes = []
    if (this.ctData['title'] !== this.lastSavedCtData['title']) {
      changes.push("New title: '" + this.ctData['title'] + "'" )
    }
    if (!this.tableEditor.getMatrix().isEqualTo(this.lastSavedEditorMatrix)) {
      changes.push('Changes in collation alignment')
    }
    return changes
  }

  genEditionEngineDetailsHtml(engineDetails) {
    let html = ''
    for(const key in engineDetails) {
      html += '<p>' + '<b>' + key + '</b>:' + engineDetails[key]
    }
    return html
  }

  fetchQuickEdition() {
    this.quickEditionDiv.html("Requesting edition from the server... <i class=\"fa fa-spinner fa-spin fa-fw\"></i>")
    let apiQuickEditionUrl = this.options.urlGenerator.apiAutomaticEdition()
    console.log('Calling API at ' + apiQuickEditionUrl)
    let apiCallOptions = {
      collationTable: this.ctData,
      baseWitnessIndex: 0
    }
    let thisObject = this
    $.post(
      apiQuickEditionUrl,
      {data: JSON.stringify(apiCallOptions)}
    ).done( function (apiResponse) {
      console.log("Quick edition API call successful")
      console.log(apiResponse)

      let ev = new EditionViewer( {
        collationTokens: apiResponse.mainTextTokens,
        apparatusArray: apiResponse.apparatusArray,
        isRightToLeft: (apiResponse.textDirection === 'rtl'),
        fontFamily: thisObject.options.langDef[thisObject.ctData['lang']].editionFont,
        addGlue: false
      })

      thisObject.quickEditionDiv.html(ev.getHtml())
      //thisObject.quickEditionDiv.html(thisObject.genEditionEngineDetailsHtml(apiResponse['engineRunDetails']))

    }).fail(function(resp) {
      console.error('Error in quick edition')
      console.log(resp)
      let failMsg = 'Error getting quick edition <i class="fa fa-frown-o" aria-hidden="true"></i><br/> '
      failMsg += '<span class="small">HTTP code ' + resp.status + '</span>'
      thisObject.quickEditionDiv.html(failMsg)
    })


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

  escapeHtml(html) {
    let entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return String(html).replace(/[&<>"'`=\/]/g, function (s) {
      return entityMap[s];
    });

  }



}