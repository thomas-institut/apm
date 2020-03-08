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

class AutomaticCollationTable {
  
  constructor(options, initialApiOptions) {
    console.log('ACT mini app starting')
    console.log('Available Witnesses:')
    console.log(options.availableWitnesses)
    console.log('ACT options')
    console.log(options)
    console.log('Initial API options')
    console.log(initialApiOptions)
    
    this.rtlClass = 'rtltext'
    this.ltrClass = 'ltrtext'
    
    //this.options = this.getCleanOptionsObject(options)

    let optionsDefinition = {
      langDef : { type: 'object', default: {
          la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3},
          ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3},
          he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3}
        }
      },
      availableWitnesses: { type: 'Array', default: [] },
      suppressTimestampsInApiCalls: { type: 'boolean', default: false},
      loadNow: { type: 'boolean', default: false },
      urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true},
      userId: { type: 'number', default: -1 },
      isPreset: { type: 'boolean', default: false },
      preset: { type: 'object', default: {
          id: -1,
          title: '',
          userId: -1,
          userName: 'nouser',
          editable: false
        }
      },
    }

    let oc = new OptionsChecker(optionsDefinition, "AutomaticCollationTable")
    this.options = oc.getCleanOptions(options)
    
    this.availableWitnesses = this.options.availableWitnesses
    this.collationTableDiv = $('#collationtablediv')
    this.collationTableNewDivId = 'newcollationtablediv'
    this.collationTableDivNew = $('#' + this.collationTableNewDivId)
    this.actTitleElement = $('#act-title')
    this.status = $('#status')
    this.collationEngineDetails = $('#collationEngineDetails')
    this.redoButton = $('#redobutton')
    this.exportCsvButton = $('#exportcsvbutton')
    this.quickEditionButton = $('#quickedbutton')
    this.versionInfoButton = $('#versioninfobutton')
    this.witnessInfoDiv = $('#versioninfo')
    this.lastTimeLabel = $('#lastTimeLabel')
    this.editionContainer = $('#editiondiv')
    this.editionDiv = $('#theedition')
    this.siglaDiv = $('#sigla')
    this.apiCollationUrl = this.options.urlGenerator.apiAutomaticCollation()
    this.updating = false

    // generate witness titles
    for(const witness of this.availableWitnesses) {
      let title = witness.typeSpecificInfo.docInfo.title
      if (witness.typeSpecificInfo.localWitnessId !== 'A') {
        title += ' (' + witness.typeSpecificInfo.localWitnessId + ')'
      }
      witness.title = title

    }

    this.apiCallOptions = initialApiOptions
    // if there are no witnesses in the initialApiOptions witnesses array, 
    // it means that ALL witnesses should be included

    if (this.apiCallOptions.witnesses.length === 0) {
      console.log('Including all witnesses in ApiCallOptions')
      for(const witness of this.availableWitnesses) {
        let sysId = witness.systemId
        if (this.options.suppressTimestampsInApiCalls) {
          sysId = this.supressTimestampFromSystemId(sysId)
        }
        this.apiCallOptions.witnesses.push({
          type: witness.type,
          systemId: sysId,
          title: witness.title
        })
      }
    }

    // Get last change in data
    // (not yet, it will be done from API response data)
    //this.lastChangeInData = this.getLastChangeInDataFromAvailableWitnesses(this.availableWitnesses, initialApiOptions)

    
    this.collationTableData = null
    this.ctf = new CollationTableFormatter({lang: initialApiOptions.lang})
    this.popoverClass = 'ctpopover'
    
    this.viewSettingsFormSelector = '#viewsettingsform'
    this.viewSettingsButton = $('#viewsettingsbutton')
    this.viewSettings = this.ctf.getOptions()
    
    this.editSettingsFormSelector = '#editsettingsform'
    this.editSettingsButton = $('#editsettingsbutton')

    this.lastTimeLabel.html('TBD')
    this.witnessInfoDiv.html('TBD')
    
    let thisObject = this


    
    this.viewSettingsFormManager = new AutomaticCollationTableViewSettingsForm(this.viewSettingsFormSelector)
    this.viewSettingsButton.on('click', function () { 
      if (thisObject.viewSettingsFormManager.isHidden()) {
        thisObject.viewSettingsFormManager.show(thisObject.viewSettings)
      } else {
        thisObject.viewSettingsFormManager.hide()
      }
    })

    this.witnessInfoDiv.addClass('hidden')
    this.versionInfoButton.on('click', function () {
      if (thisObject.witnessInfoDiv.hasClass('hidden')) {
        thisObject.witnessInfoDiv.removeClass('hidden')
        thisObject.versionInfoButton.html('<i class="fas fa-angle-down" aria-hidden="true"></i>')
      } else {
        thisObject.witnessInfoDiv.addClass('hidden')
        thisObject.versionInfoButton.html('<i class="fas fa-angle-right" aria-hidden="true"></i>')
      }
    })

    this.viewSettingsFormManager.on('cancel', function() {
      thisObject.viewSettingsFormManager.hide()
    })
    this.viewSettingsFormManager.on('apply', function(e) {
      thisObject.viewSettings = e.detail
      console.log('Got view settings from form')
      console.log(thisObject.viewSettings)

      thisObject.ctf.setOptions(thisObject.viewSettings)
      thisObject.collationTableDiv.html(thisObject.ctf.format(thisObject.collationTableData, thisObject.popoverClass))
      thisObject.setCsvDownloadFile(thisObject.collationTableData)
      thisObject.viewSettingsFormManager.hide()

      if (thisObject.viewSettings.multipleRows) {
        thisObject.tableEditor.showInMultipleRows(thisObject.viewSettings.maxColumnsPerTable, false)
      } else {
        thisObject.tableEditor.showInSingleRow(false)
      }

      thisObject.tableEditor.redrawTable()
    })
    
    
    let actSettingsFormOptions = {
      containerSelector : this.editSettingsFormSelector, 
      availableWitnesses: this.availableWitnesses,
      langDef: this.options.langDef,
      urlGenerator: this.options.urlGenerator,
      userId:  this.options.userId,
      isPreset: this.options.isPreset,
      suppressTimestampsInSettings:  this.options.suppressTimestampsInApiCalls
    }
    if (this.options.isPreset) {
      actSettingsFormOptions.preset = this.options.preset
    }
    this.editSettingsFormManager =  new AutomaticCollationTableSettingsForm(actSettingsFormOptions)
    
    this.editSettingsButton.on('click', function () { 
      if (thisObject.editSettingsFormManager.isHidden()) {
        thisObject.editSettingsFormManager.show(thisObject.apiCallOptions)
      } else {
        thisObject.editSettingsFormManager.hide()
      }
    })
    
    this.editSettingsFormManager.on('cancel', function(){
      thisObject.actTitleElement.html(
                thisObject.editSettingsFormManager.getTitleFromSettings(thisObject.apiCallOptions))
        thisObject.editSettingsFormManager.hide()
    })
                
    this.editSettingsFormManager.on('apply', function(e){
        thisObject.apiCallOptions = e.detail
        console.log('Got options from form:')
        console.log(thisObject.apiCallOptions)
        thisObject.editSettingsFormManager.hide()
        thisObject.getCollationTable()
    })
    
     this.editSettingsFormManager.on('settings-change', function(e){
        thisObject.actTitleElement.html(
                thisObject.editSettingsFormManager.getTitleFromSettings())
    })

    
    
    this.collationTableDiv.html('')
    this.collationEngineDetails.html('')
    this.status.html('')
    this.actTitleElement.html(this.getTitleFromOptions())
    this.editionContainer.addClass('hidden')
    
    this.quickEditionButton.on('click', function() {
      if (thisObject.editionContainer.hasClass('hidden')) {
        thisObject.editionContainer.removeClass('hidden')
      } else {
        thisObject.editionContainer.addClass('hidden')
      }
    })
    
    this.redoButton.on('click', function() { 
      console.log('redoButton clicked')
      thisObject.getCollationTable()
    })
    if (this.options.loadNow) {
        this.getCollationTable()
    }
  }


  getLastChangeInDataFromAvailableWitnesses(availableWitnesses, apiCallOptions) {
    let lastChangeInData = ''
      for(const witness of availableWitnesses) {
        if (witness.typeSpecificInfo.timeStamp > lastChangeInData) {
          lastChangeInData = witness.typeSpecificInfo.timeStamp
        }
      }
      return lastChangeInData
  }

  getLastChangeInDataFromApiResponse(apiData) {
    let ctData = apiData['newCollationTable']
    let lastChangeInData = ''
    for(const witness of ctData['witnesses']) {
      if (witness['timeStamp'] > lastChangeInData) {
        lastChangeInData = witness['timeStamp']
      }
    }
    return lastChangeInData

  }

  getTitleFromOptions() {
    
    return this.editSettingsFormManager.getTitleFromSettings(this.apiCallOptions)

  }
  
  getCollationTable() {
    console.log('All set to call API at ' + this.apiCollationUrl)
    console.log('API call options:')
    console.log(this.apiCallOptions)
    this.updating = true
    this.redoButton.prop('disabled', true)
    this.actTitleElement.html(this.getTitleFromOptions())
    this.status.html('Collating... <i class="fa fa-spinner fa-spin fa-fw"></i>')
    this.collationTableDiv.html('')
    this.collationEngineDetails.html('')
     this.editionContainer.addClass('hidden')
    this.lastTimeLabel.html('TBD...')
    this.witnessInfoDiv.html('TBD...')

    
    let thisObject = this
    $.post(
      this.apiCollationUrl, 
      { data: JSON.stringify(this.apiCallOptions) }
    )
    .done(function (data) { 
      console.log('Automatic collation successful. Data:')
      console.log(data)
      thisObject.collationTableData = data
      thisObject.status.html('Collating... done, formatting table <i class="fa fa-spinner fa-spin fa-fw"></i>')
      thisObject.lastChangeInData = thisObject.getLastChangeInDataFromApiResponse(data)
      thisObject.lastTimeLabel.html(thisObject.formatDateTime(thisObject.lastChangeInData))
      thisObject.witnessInfoDiv.html(thisObject.getVersionInfoHtml(data))

      if (thisObject.options.langDef[thisObject.apiCallOptions.lang].rtl) {
        thisObject.collationTableDiv.removeClass(thisObject.ltrClass)
        thisObject.collationTableDiv.addClass(thisObject.rtlClass)
      }
      
      thisObject.collationTableDiv.html(thisObject.ctf.format(data, thisObject.popoverClass))

      thisObject.setCsvDownloadFile(data)
      
      thisObject.status.html('')
      thisObject.redoButton.prop('disabled', false)
      thisObject.updating = false
      thisObject.collationEngineDetails.html(thisObject.getCollationEngineDetailsHtml(data.collationEngineDetails))

      let ev = new EditionViewer( {
          collationTokens: data.quickEdition.mainTextTokens,
          apparatusArray: data.quickEdition.apparatusArray,
          isRightToLeft: (data.quickEdition.textDirection === 'rtl'),
          addGlue: false
      })

      thisObject.editionDiv.html(ev.getHtml())
      let siglaHtml = '<ul class="siglalist">'
      siglaHtml += '<li>' + 'Base witness: ' + data.quickEdition.baseSiglum + '</li>'
      for(const abbr in data.quickEdition.abbrToSigla) {
          siglaHtml += '<li>' + '<em>' + abbr + '</em>: ' + data.quickEdition.abbrToSigla[abbr] + '</li>'
      }
      siglaHtml += '</ul>'
      thisObject.siglaDiv.html(siglaHtml)

      // new table
     thisObject.collationTableDivNew.popover({
        trigger: "hover",
        selector: '.withpopover',
        delay: {show: 500 , hide:0},
        placement: "auto top",
        html: true,
        container: 'body'
      })

      thisObject.setupTableEditorFromApiData()
      
    })
    .fail(function(resp) {
      console.log('Error in automatic collation, resp:')
      console.log(resp)
      let failMsg = 'Collating... fail <i class="fa fa-frown-o" aria-hidden="true"></i><br/> '
      failMsg += '<span class="small">HTTP code ' + resp.status + '</span>'
      if (typeof(resp.responseJSON) !== 'undefined') {
        failMsg += '<br/><span class="small"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>&nbsp;Error '  + resp.responseJSON.error + '</span>'
      }
      thisObject.status.html(failMsg)
      thisObject.updating = false
    })
  }
  
  getCollationEngineDetailsHtml(ced) {
    let cedHtml = '<b>Engine:</b> ' + ced.engineName + '<br/>'
    cedHtml += '<b>Date/Time:</b> '  + ced.runDateTime + '<br/>'
    cedHtml += '<b>Collation Runtime:</b> ' + Math.round(ced.duration*1000.0) + ' ms' + '<br/>'
    cedHtml += '<b>Total Runtime:</b> ' + Math.round(ced.totalDuration*1000.0) + ' ms'
    return cedHtml
  }
  
  setViewSettingsInForm(settings) {
    if (settings.highlightVariants) {
      
    }
  }
  
  setCsvDownloadFile(data) {
    let href = 'data:text/csv,' + encodeURIComponent(this.ctf.generateCsv(data))
    this.exportCsvButton.attr('href', href)
  }

  getVersionInfoHtml(apiData) {
    let ctData = apiData['newCollationTable']
    let sigla = ctData['sigla']
    let witnesses = ctData['witnesses']
    let html = ''
    html += '<ul>'
    for(let i=0; i < witnesses.length; i++) {
      let witness = witnesses[i]
      let siglum = sigla[i]
      if(witness['witnessType'] === 'fullTx') {
        html += '<li><b>' + siglum + '</b>: ' +  this.formatDateTime(witness['timeStamp']) + '</li>'
      }
    }
    html += '</ul>'

    return html
  }

  formatDateTime(sqlDateTimeString) {
    return moment(sqlDateTimeString).format('D MMM YYYY, H:mm:ss')
  }

  formatNoteTime(timeStamp) {
    return moment(timeStamp).format('D MMM YYYY, H:mm')
  }

  padMinutes(minutes) {
    if (minutes < 10) {
      return '0' + minutes
    }
    return minutes
  }

  supressTimestampFromSystemId(systemId) {
    let fields = systemId.split('-')
    if (fields.length === 6 ) {
      fields.pop()
    }
    return fields.join('-')
  }

  // Functions for  Table Editor
  setupTableEditorFromApiData() {
    let data = this.collationTableData

    // div text direction
    if (this.options.langDef[data['newCollationTable']['lang']].rtl) {
      this.collationTableDivNew.removeClass(this.ltrClass)
      this.collationTableDivNew.addClass(this.rtlClass)
    } else {
      this.collationTableDivNew.removeClass(this.rtlClass)
      this.collationTableDivNew.addClass(this.ltrClass)
    }

    let rowDefinition = []
    for (let i = 0; i < data['newCollationTable']['sigla'].length; i++) {
      let witness = data['newCollationTable'].witnesses[i]
      let siglum = data['newCollationTable']['sigla'][i]
      let tokenArray = data['newCollationTable']['collationMatrix'][i]
      rowDefinition.push({
        title: siglum,
        values: tokenArray,
        isEditable: false
      })
    }
    this.tableEditor = new TableEditor({
      id: this.collationTableNewDivId,
      showInMultipleRows: true,
      columnsPerRow: this.viewSettings.maxColumnsPerTable,
      rowDefinition: rowDefinition,
      drawTableInConstructor: false,
      getEmptyValue: function() { return -1},
      isEmptyValue: function(value) { return value === -1},
      generateCellContent: this.genGenerateCellContentFunction(),
      generateTableClasses: this.genGenerateTableClassesFunction(),
      generateCellClasses: this.genGenerateCellClassesFunction(),
      generateCellTdExtraAttributes: this.genGenerateCellTdExtraAttributesFunction()
    })
    this.variantsMatrix = this.genVariantsMatrix(this.tableEditor.getMatrix(), data['newCollationTable']['witnesses'])
    this.tableEditor.redrawTable()
  }

  genGenerateCellTdExtraAttributesFunction() {
    let thisObject = this
    return function(row, col, value) {
      if (value === -1) {
        return ''
      }
      let peopleInfo =thisObject.collationTableData['newCollationTable']['people']
      let tokenArray = thisObject.collationTableData['newCollationTable']['witnesses'][row]['tokens']
      let token = tokenArray[value]
      let lang = token['itemData'][0]['lang']
      // console.log("Lang: " + lang)
      let langClass = 'popover-' + lang
      let popoverHtml = ''
      popoverHtml += '<p class="popoverheading ' + langClass + '">' + token.text
      if (token.normalizedText !== token.text) {
        popoverHtml += '<br/>&equiv; ' + token.normalizedText + '<br/>'
      }
      popoverHtml += '</p>'
      popoverHtml += '<p class="popoveriteminfo ' + langClass + '">'
      if (token['itemData'].length === 1) {
        popoverHtml += thisObject.getItemPopoverHtmlForToken(row, token,token['itemData'][0], peopleInfo, false)
      } else {
        for (const itemData of token['itemData']) {
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

  getTokenAddressHtml(row, token) {
    let html = ''
    let itemWithAddressArray = this.collationTableData['newCollationTable']['witnesses'][row]['items']
    let itemData = token['itemData'][0]
    let itemWithAddress = itemWithAddressArray[itemData['itemIndex']]

    let page = itemWithAddress.address.foliation
    let column = token.lineRange.start['textBox']
    let line = -1
    if (column > 10) {
      // this is a marginal really
      column = 'margin'
    } else {
      line = token.lineRange.start['lineNumber']
    }

    html += '<b>Page: </b>' + page + '</br>'
    html += '<b>Column: </b>' + column + '</br>'
    if (line !== -1) {
      html += '<b>Line: </b>' + line + '</br>'
    }

    return html
  }

  getItemPopoverHtmlForToken(row, token, itemData, peopleInfo, showItemText = false) {
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

    let itemWithAddressArray = this.collationTableData['newCollationTable']['witnesses'][row]['items']
    let item = itemWithAddressArray[itemData['itemIndex']]['item']

    if (item.type !== 'TextualItem') {
      return ''
    }
    if (itemData.text === "\n") {
      return ''
    }

    let html = ''
    let indentHtml = ''
    if (showItemText) {
      html += itemBullet + itemData.text + lineBreakHtml
      indentHtml = oneIndentUnit
    }
    let isNormalText = true
    if (item.format !== '') {
      html += indentHtml + '<b>Format: </b>' + item.format + lineBreakHtml
      isNormalText = false
    }
    if (item.clarity === 0) {
      html += indentHtml + '<b>Illegible</b>' + lineBreakHtml
      html += indentHtml + unclearIcon + item.clarityReason
      isNormalText = false
    }
    if (item.clarity === 0.5) {
      html += indentHtml + '<b>Unclear</b>' + lineBreakHtml
      html += indentHtml + unclearIcon + item.clarityReason
      isNormalText = false
    }
    if (item.textualFlow === 1) {
      html += indentHtml + '<b>Addition</b>'+ lineBreakHtml
      html += indentHtml + locationIcon + item.location
      isNormalText = false
    }
    if (item.deletion !== '') {
      html += indentHtml + '<b>Deletion</b>'+ lineBreakHtml
      html += indentHtml + deletionIcon + item.deletion
      isNormalText = false
    }
    if (item.normalizationType !== '') {
      let normLabel = item.normalizationType
      if (normalizationLabels[item.normalizationType] !== undefined) {
        normLabel = normalizationLabels[item.normalizationType]
      }

      html += indentHtml +  '<b>' + normLabel + '</b>' + lineBreakHtml
      html += '+ ' + itemData.text + lineBreakHtml
      if (token.normalizedText === itemData.text) {
        html += '= ' + '(no reading given)'
      } else {
        html += '= ' + token.normalizedText
      }

      isNormalText = false
    }
    if (isNormalText) {
      html += indentHtml + 'Normal Text'+ lineBreakHtml
    }
    html += lineBreakHtml

    // notes
    if (item.notes.length > 0) {
      html += indentHtml + '<b>Notes</b>' + lineBreakHtml
      html += this.getNotesHtml(item.notes, peopleInfo)
    }

    return html

  }

  getNotesHtml(notes, peopleInfo) {
    let html = ''
    let lineBreakHtml = '<br/>'
    let oneIndentUnit = '&nbsp;&nbsp;'
    for(const note of notes) {
      html +=  oneIndentUnit + note.text + lineBreakHtml
      html +=  oneIndentUnit + '<span class="authorinfo">-- ' +
        peopleInfo[note.authorId].shortName  + ', ' + this.formatNoteTime(note.timeStamp)  +
        "</span>" + lineBreakHtml
      html += lineBreakHtml
    }
    return html
  }

  genGenerateCellContentFunction() {
    let thisObject = this
    let noteIconSpan = ' <span class="noteicon"><i class="far fa-comment"></i></span>'
    let normalizationSymbol = '<b><sub>N</sub></b>'
    return function(row, col, value) {
      if (value === -1) {
        return '&mdash;'
      }
      let tokenArray = thisObject.collationTableData['newCollationTable']['witnesses'][row]['tokens']
      let token = tokenArray[value]
      let postNotes = thisObject.getPostNotes(row, col, value)
      if (token['itemData'].length === 1 && postNotes.length === 0) {
        if (thisObject.viewSettings.showNormalizations && token.text !== token.normalizedText) {
          return token.normalizedText + normalizationSymbol
        }
        return token.text
      }
      // spans for different items
      let itemWithAddressArray = thisObject.collationTableData['newCollationTable']['witnesses'][row]['items']
      let cellHtml = ''
      for (const itemData of token['itemData']) {
        let theItem = itemWithAddressArray[itemData['itemIndex']]['item']
        if (theItem.type === 'TextualItem' && itemData['text'] !== "\n") {
          cellHtml += '<span class="' + thisObject.getClassesFromItem(theItem).join(' ') + '">'
          cellHtml += itemData['text']
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

  getPostNotes(row, col, tokenIndex) {
    //console.log('Get post notes: r' + row + ' c' + col + ' i' + tokenIndex)
    let postItemIndexes = this.collationTableData['newCollationTable']['aggregatedNonTokenItemIndexes'][row][tokenIndex]['post']
    let itemWithAddressArray = this.collationTableData['newCollationTable']['witnesses'][row]['items']
    let notes = []
    for(const itemIndex of postItemIndexes) {

      let theItem = itemWithAddressArray[itemIndex]['item']
      for(const note of theItem.notes) {
        notes.push(note)
      }
    }
    return notes
  }

  genGenerateCellClassesFunction() {
    let thisObject = this
    return function(row, col, value) {
      if (value === -1) {
        return [ 'emptytoken']
      }
      let tokenArray = thisObject.collationTableData['newCollationTable']['witnesses'][row]['tokens']
      let itemWithAddressArray = thisObject.collationTableData['newCollationTable']['witnesses'][row]['items']

      let token = tokenArray[value]
      let classes = thisObject.getTokenClasses(token)
      // popoverclass
      classes.push('withpopover')
      //variant class
      if (thisObject.viewSettings.highlightVariants) {
        classes.push('variant_' + thisObject.variantsMatrix.getValue(row, col))
      }
      // get itemZero
      let itemZeroIndex = token['itemData'][0]['itemIndex']
      let itemZero = itemWithAddressArray[itemZeroIndex]['item']


      // language class
      classes.push( itemZero['language'] + '-td')
      if (token['itemData'].length === 1) {
        // td inherits the classes from the single source item
        return classes.concat(thisObject.getClassesFromItem(itemZero))
      }
      return classes
    }
  }

  getClassesFromItem(item) {
    let classes = []
    classes.push( 'hand_' + item.hand)
    if (item.format !== '') {
      classes.push(item.format)
    }
    if (item.clarity !== 1) {
      classes.push('unclear')
    }
    if (item.textualFlow === 1) {
      classes.push('addition')
    }
    if (item.deletion !== '') {
      classes.push('deletion')
    }
    if (item.normalizationType !== '') {
      classes.push(item.normalizationType)
    }
    return classes
  }

  getTokenClasses(token) {
    let classes = []
    classes.push('tokentype_' + token.type)
    return classes
  }

  genGenerateTableClassesFunction() {
    let thisObject = this
    return function() {
      let langCode = thisObject.collationTableData['newCollationTable']['lang']
      return [ ('te-table-' + langCode) ]
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
        textCol.push(witnesses[row].tokens[ref].normalizedText)
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
