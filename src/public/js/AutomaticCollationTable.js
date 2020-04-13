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
    // console.log('ACT mini app starting')
    // console.log('Available Witnesses:')
    // console.log(options.availableWitnesses)
    // console.log('ACT options')
    // console.log(options)
    // console.log('Initial API options')
    // console.log(initialApiOptions)
    
    this.rtlClass = 'rtltext'
    this.ltrClass = 'ltrtext'
    
    //this.options = this.getCleanOptionsObject(options)

    let optionsDefinition = {
      workId : { type: 'string', required: true},
      chunkNumber: {type: 'NonZeroNumber', required: true},
      langDef : { type: 'object', default: {
          la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3, editionFont: 'Times New Roman'},
          ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3, editionFont: 'ApmNotoNaskhArabicUI'},
          he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3, editionFont: 'Times New Roman'}
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
    this.collationTableNewDivId = 'collationtablediv'
    this.collationTableDivNew = $('#' + this.collationTableNewDivId)
    this.actTitleElement = $('#act-title')
    this.status = $('#status')
    this.collationEngineDetailsElement = $('#collationEngineDetails')
    this.redoButton = $('#redobutton')
    this.exportCsvButton = $('#exportcsvbutton')
    this.quickEditionButton = $('#quickedbutton')
    this.versionInfoButton = $('#versioninfobutton')
    this.witnessInfoDiv = $('#versioninfo')
    this.lastTimeLabel = $('#lastTimeLabel')
    this.editionContainer = $('#editiondiv')
    this.editionDiv = $('#theedition')
    this.collationTableActionsDiv = $('#collationTableActions')
    this.saveTableButton = $('#savetablebutton')
    this.siglaDiv = $('#sigla')
    this.apiCollationUrl = this.options.urlGenerator.apiAutomaticCollation()
    this.apiQuickEditionUrl = this.options.urlGenerator.apiAutomaticEdition()
    this.apiSaveCollationUrl = this.options.urlGenerator.apiSaveCollation()
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
      //console.log('Including all witnesses in ApiCallOptions')
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

    // TODO: change this to a reasonable default
    this.collationTable = null
    this.peopleInfo = []
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


    // save table button
    this.saveTableButton.on('click', this.genOnClickSaveTableButton())

    
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
      thisObject.setCsvDownloadFile()
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
      suppressTimestampsInSettings:  this.options.suppressTimestampsInApiCalls,
      applyButtonText: 'Redo collation'
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

    this.collationTableDiv.popover({
      trigger: "hover",
      selector: '.withpopover',
      delay: {show: 500 , hide:0},
      placement: "auto top",
      html: true,
      container: 'body'
    })
    
    this.collationTableDiv.html('')
    this.collationEngineDetailsElement.html('')
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

  genOnClickSaveTableButton() {
    let thisObject = this
    return function () {
      if (this.tableSaved) {
        console.log('Save table button clicked, but table is already saved')
        return false
      }
      console.log('Saving table via API call to ' + thisObject.apiSaveCollationUrl)
      let apiCallOptions = {
        collationTable: thisObject.collationTable,
        source: 'auto',
        baseSiglum: thisObject.collationTable.sigla[0]
      }
      $.post(
        thisObject.apiSaveCollationUrl,
        {data: JSON.stringify(apiCallOptions)}
      ).done( function (apiResponse){
        console.log("Success saving table")
        console.log(apiResponse)
        let tableId = apiResponse['tableId']
        let url = thisObject.options.urlGenerator.siteEditCollationTable(tableId)

        thisObject.collationTableActionsDiv.html('Table saved: <a href="' + url + '">Edit table</a>')

      }).fail(function(resp){
        console.error("Cannot save table")
        console.log(resp)
      })

    }
  }

  fetchQuickEdition() {
    this.editionDiv.html("Requesting edition from the server... <i class=\"fa fa-spinner fa-spin fa-fw\"></i>")
    console.log('Calling API at ' + this.apiQuickEditionUrl)
    let apiCallOptions = {
      collationTable: this.collationTable,
      baseWitnessIndex: 0
    }
    let thisObject = this
    $.post(
      this.apiQuickEditionUrl,
      {data: JSON.stringify(apiCallOptions)}
    ).done( function (apiResponse) {
      console.log("Quick edition API call successful")
      console.log(apiResponse)
      //thisObject.editionDiv.html("Edition Status: " + apiResponse['status'])


      let ev = new EditionViewer( {
        collationTokens: apiResponse.mainTextTokens,
        apparatusArray: apiResponse.apparatusArray,
        isRightToLeft: (apiResponse.textDirection === 'rtl'),
        fontFamily: thisObject.options.langDef[thisObject.collationTable['lang']].editionFont,
        addGlue: false
      })

      thisObject.editionDiv.html(ev.getHtml())

      // let siglaHtml = '<ul class="siglalist">'
      // siglaHtml += '<li>' + 'Base witness: ' + data.quickEdition.baseSiglum + '</li>'
      // for(const abbr in data.quickEdition.abbrToSigla) {
      //   siglaHtml += '<li>' + '<em>' + abbr + '</em>: ' + data.quickEdition.abbrToSigla[abbr] + '</li>'
      // }
      // siglaHtml += '</ul>'
      // thisObject.siglaDiv.html(siglaHtml)



    }).fail(function(resp) {
      console.error('Error in quick edition')
      console.log(resp)
      let failMsg = 'Error getting quick edition <i class="fa fa-frown-o" aria-hidden="true"></i><br/> '
      failMsg += '<span class="small">HTTP code ' + resp.status + '</span>'
      thisObject.editionDiv.html(failMsg)
    })


  }

  getLastChangeInData() {
    let ctData = this.collationTable
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
    //console.log('All set to call API at ' + this.apiCollationUrl)
    //console.log('API call options:')
    //console.log(this.apiCallOptions)
    this.updating = true
    this.redoButton.prop('disabled', true)
    this.actTitleElement.html(this.getTitleFromOptions())
    this.status.html('Collating... <i class="fa fa-spinner fa-spin fa-fw"></i>')
    //this.collationTableDiv.html('')
    this.collationTableDivNew.html('')
    this.collationTableActionsDiv.addClass('hidden')
    this.collationEngineDetailsElement.html('')
     this.editionContainer.addClass('hidden')
    this.lastTimeLabel.html('TBD...')
    this.witnessInfoDiv.html('TBD...')

    
    let thisObject = this
    $.post(
      this.apiCollationUrl, 
      { data: JSON.stringify(this.apiCallOptions) }
    )
    .done(function (apiResponse) {
      console.log('Automatic collation successful. Data:')
      console.log(apiResponse)
      thisObject.setDataFromApiResponse(apiResponse)
      thisObject.status.html('Collating... done,<br/>Formatting table <i class="fa fa-spinner fa-spin fa-fw"></i>')
      thisObject.lastChangeInData = thisObject.getLastChangeInData()
      thisObject.lastTimeLabel.html(thisObject.formatDateTime(thisObject.lastChangeInData))
      thisObject.witnessInfoDiv.html(thisObject.getVersionInfoHtml())

      thisObject.setCsvDownloadFile()
      
      thisObject.status.html('')
      thisObject.redoButton.prop('disabled', false)
      thisObject.updating = false
      thisObject.collationEngineDetailsElement.html(thisObject.getCollationEngineDetailsHtml())
      thisObject.collationTableActionsDiv.removeClass('hidden')

      // let ev = new EditionViewer( {
      //     collationTokens: thisObject.quickEdition.mainTextTokens,
      //     apparatusArray: thisObject.quickEdition.apparatusArray,
      //     isRightToLeft: (thisObject.quickEdition.textDirection === 'rtl'),
      //     addGlue: false
      // })


      thisObject.fetchQuickEdition()

      // let siglaHtml = '<ul class="siglalist">'
      // siglaHtml += '<li>' + 'Base witness: ' + thisObject.quickEdition.baseSiglum + '</li>'
      // for(const abbr in thisObject.quickEdition.abbrToSigla) {
      //     siglaHtml += '<li>' + '<em>' + abbr + '</em>: ' + thisObject.quickEdition.abbrToSigla[abbr] + '</li>'
      // }
      // siglaHtml += '</ul>'
      // thisObject.siglaDiv.html(siglaHtml)

      // new table
     thisObject.collationTableDivNew.popover({
        trigger: "hover",
        selector: '.withpopover',
        delay: {show: 500 , hide:0},
        placement: "auto top",
        html: true,
        container: 'body'
      })

      thisObject.setupTableEditor()
      
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

  setDataFromApiResponse(apiResponse) {
    this.collationTable = apiResponse.collationTable
    this.peopleInfo = apiResponse.people
    this.quickEdition = apiResponse.quickEdition
    this.collationEngineDetails = apiResponse.collationEngineDetails
    this.aggregatedNonTokenItemIndexes = this.calculateAggregatedNonTokenItemIndexes()

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
    for (let witnessIndex = 0; witnessIndex < this.collationTable['witnesses'].length; witnessIndex++) {
      let tokenRefs = this.collationTable['collationMatrix'][witnessIndex]
      let witness = this.collationTable['witnesses'][witnessIndex]
      indexes[witnessIndex] = this.aggregateNonTokenItemIndexes(witness, tokenRefs)
    }

    return indexes
  }
  
  getCollationEngineDetailsHtml() {
    let ced = this.collationEngineDetails
    let cedHtml = '<b>Engine:</b> ' + ced.engineName + '<br/>'

    cedHtml += '<b>Cached:</b> ' + ced.cached + '<br/>'
    if (!ced.cached) {
      cedHtml += '<b>Date/Time:</b> '  + ced.runDateTime + '<br/>'
      cedHtml += '<b>Collation Runtime:</b> ' + Math.round(ced.duration*1000.0) + ' ms' + '<br/>'
      cedHtml += '<b>Total Runtime:</b> ' + Math.round(ced.totalDuration*1000.0) + ' ms'
    } else {
      cedHtml += '<b>Origial Date/Time:</b> '  + ced.runDateTime + '<br/>'
      cedHtml += '<b>Original Collation Runtime:</b> ' + Math.round(ced.duration*1000.0) + ' ms' + '<br/>'
      cedHtml += '<b>Original Total Runtime:</b> ' + Math.round(ced.totalDuration*1000.0) + ' ms' + '<br/>'
      cedHtml += '<b>Cached Runtime:</b> ' + Math.round(ced.cachedRunTime *1000.0) + ' ms' + '<br/>'

    }

    return cedHtml
  }

  setCsvDownloadFile() {
    let href = 'data:text/csv,' + encodeURIComponent(this.generateCsv())
    this.exportCsvButton.attr('href', href)
  }


  generateCsv(sep = ',') {
    let collationTable = this.collationTable
    let sigla = collationTable.sigla
    let numWitnesses = collationTable.witnesses.length

    let output = ''
    for (let i=0; i < numWitnesses; i++) {
      let siglum = sigla[i]
      output += siglum + sep
      let ctRefRow = collationTable.collationMatrix[i]
      for (let tkRefIndex = 0; tkRefIndex < ctRefRow.length; tkRefIndex++) {
        let tokenRef = ctRefRow[tkRefIndex]
        let tokenCsvRep = ''
        if (tokenRef !== -1 ) {
          let token = collationTable.witnesses[i].tokens[tokenRef]
          tokenCsvRep = this.getCsvRepresentationForToken(token, this.options.showNormalizations)
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


  getVersionInfoHtml() {
    let sigla = this.collationTable['sigla']
    let witnesses = this.collationTable['witnesses']
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

  supressTimestampFromSystemId(systemId) {
    let fields = systemId.split('-')
    if (fields.length === 6 ) {
      fields.pop()
    }
    return fields.join('-')
  }

  // Functions for  Table Editor
  setupTableEditor() {
    let collationTable = this.collationTable

    // div text direction
    if (this.options.langDef[collationTable['lang']].rtl) {
      this.collationTableDivNew.removeClass(this.ltrClass)
      this.collationTableDivNew.addClass(this.rtlClass)
    } else {
      this.collationTableDivNew.removeClass(this.rtlClass)
      this.collationTableDivNew.addClass(this.ltrClass)
    }

    let rowDefinition = []
    for (let i = 0; i < collationTable['sigla'].length; i++) {
      //let witness = collationTable.witnesses[i]
      let siglum = collationTable['witnessTitles'][i]
      let tokenArray = collationTable['collationMatrix'][i]
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
    this.variantsMatrix = CollationTableUtil.genVariantsMatrix(this.tableEditor.getMatrix(), collationTable['witnesses'])
    this.tableEditor.redrawTable()
  }

  genGenerateCellTdExtraAttributesFunction() {
    let thisObject = this
    return function(row, col, value) {
      if (value === -1) {
        return ''
      }
      let collationTable = thisObject.collationTable
      let peopleInfo =thisObject.peopleInfo
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
      if (token.normalizedText !== undefined) {
        popoverHtml += '<br/>&equiv; ' + token.normalizedText + '<br/>'
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

  getTokenAddressHtml(row, token) {
    let html = ''
    let itemWithAddressArray = this.collationTable['witnesses'][row]['items']
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

    let itemWithAddressArray = this.collationTable['witnesses'][row]['items']
    let item = itemWithAddressArray[tokenSourceItemData['index']]
    let tokenItemText = ''
    if (item['text'] !== undefined) {
      tokenItemText = item['text'].substring(tokenSourceItemData.charRange.from, tokenSourceItemData.charRange.to+1)
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
      html += indentHtml + unclearIcon + item.clarityReason
      isNormalText = false
    }
    if (item.textualFlow === 1) {
      html += indentHtml + '<b>Addition</b>'+ lineBreakHtml
      html += indentHtml + locationIcon + item.location
      isNormalText = false
    }
    if (item.deletion !== undefined) {
      html += indentHtml + '<b>Deletion</b>'+ lineBreakHtml
      html += indentHtml + deletionIcon + item.deletion
      isNormalText = false
    }
    if (item.normalizationType !== undefined) {
      let normLabel = item.normalizationType
      if (normalizationLabels[item.normalizationType] !== undefined) {
        normLabel = normalizationLabels[item.normalizationType]
      }

      html += indentHtml +  '<b>' + normLabel + '</b>' + lineBreakHtml
      html += '+ ' + tokenItemText + lineBreakHtml
      if (token.normalizedText === tokenItemText) {
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
    if (item.notes !== undefined && item.notes.length > 0) {
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
      let tokenArray = thisObject.collationTable['witnesses'][row]['tokens']
      let token = tokenArray[value]
      let postNotes = thisObject.getPostNotes(row, col, value)
      if (token['sourceItems'].length === 1 && postNotes.length === 0) {
        if (thisObject.viewSettings.showNormalizations && token.normalizedText !== undefined) {
          return token.normalizedText + normalizationSymbol
        }
        return token.text
      }
      // spans for different items
      let itemWithAddressArray = thisObject.collationTable['witnesses'][row]['items']
      let cellHtml = ''
      for (const itemData of token['sourceItems']) {
        let theItem = itemWithAddressArray[itemData['index']]
        let itemText = ''
        if (theItem['text'] !== undefined) {
          itemText = theItem['text'].substring(itemData.charRange.from, itemData.charRange.to + 1)
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

  getPostNotes(row, col, tokenIndex) {
    //console.log('Get post notes: r' + row + ' c' + col + ' i' + tokenIndex)
    let postItemIndexes = this.aggregatedNonTokenItemIndexes[row][tokenIndex]['post']
    let itemWithAddressArray = this.collationTable['witnesses'][row]['items']
    let notes = []
    for(const itemIndex of postItemIndexes) {
      let theItem = itemWithAddressArray[itemIndex]
      let itemNotes = []
      if (theItem.notes !== undefined) {
        itemNotes = theItem.notes
      }
      for(const note of itemNotes) {
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
      let tokenArray = thisObject.collationTable['witnesses'][row]['tokens']
      let itemWithAddressArray = thisObject.collationTable['witnesses'][row]['items']

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
      let lang = thisObject.collationTable['witnesses'][row]['lang']
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
    if (item.clarity !== undefined && item.clarity !== 1) {
      classes.push('unclear')
    }
    if (item.textualFlow!== undefined && item.textualFlow === 1) {
      classes.push('addition')
    }
    if (item.deletion !== undefined && item.deletion !== '') {
      classes.push('deletion')
    }
    if (item.normalizationType !== undefined && item.normalizationType !== '') {
      classes.push(item.normalizationType)
    }
    return classes
  }

  getTokenClasses(token) {
    let classes = []
    classes.push('tokentype_' + token.tokenType)
    return classes
  }

  genGenerateTableClassesFunction() {
    let thisObject = this
    return function() {
      let langCode = thisObject.collationTable['lang']
      return [ ('te-table-' + langCode) ]
    }
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
