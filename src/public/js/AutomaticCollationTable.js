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
    this.actTitleElement = $('#act-title')
    this.status = $('#status')
    this.collationEngineDetails = $('#collationEngineDetails')
    this.redoButton = $('#redobutton')
    this.exportCsvButton = $('#exportcsvbutton')
    this.quickEditionButton = $('#quickedbutton')
    this.versionInfoButton = $('#versioninfobutton')
    this.versionInfoDiv = $('#versioninfo')
    this.lastTimeLabel = $('#lastTimeLabel')
    this.editionContainer = $('#editiondiv')
    this.editionDiv = $('#theedition')
    this.siglaDiv = $('#sigla')
    this.apiCollationUrl = this.options.urlGenerator.apiAutomaticCollation()
    this.updating = false

    // Get witness titles and last change in data
    this.lastChangeInData = ''
    for(const witness of this.availableWitnesses) {
      let title = witness.typeSpecificInfo.docInfo.title
      if (witness.typeSpecificInfo.localWitnessId !== 'A') {
        title += ' (' + witness.typeSpecificInfo.localWitnessId + ')'
      }
      witness.title = title
      if (witness.typeSpecificInfo.timeStamp > this.lastChangeInData) {
        this.lastChangeInData = witness.typeSpecificInfo.timeStamp
      }
    }


    this.apiCallOptions = initialApiOptions
    // if there are no witnesses in the initialApiOptions witnesses array, 
    // it means that ALL witnesses should be included

    if (this.apiCallOptions.witnesses.length === 0) {
      for(const witness of this.availableWitnesses) {
        this.apiCallOptions.witnesses.push({
          type: witness.type,
          systemId: witness.systemId,
          title: witness.title
        })
      }
    }
    
    this.collationTableData = null
    this.ctf = new CollationTableFormatter({lang: initialApiOptions.lang})
    this.popoverClass = 'ctpopover'
    
    this.viewSettingsFormSelector = '#viewsettingsform'
    this.viewSettingsButton = $('#viewsettingsbutton')
    this.viewSettings = this.ctf.getOptions()
    
    this.editSettingsFormSelector = '#editsettingsform'
    this.editSettingsButton = $('#editsettingsbutton')

    this.lastTimeLabel.html(this.formatDateTime(this.lastChangeInData))
    this.versionInfoDiv.html(this.getVersionInfoHtml())
    
    let thisObject = this


    
    this.viewSettingsFormManager = new AutomaticCollationTableViewSettingsForm(this.viewSettingsFormSelector)
    this.viewSettingsButton.on('click', function () { 
      if (thisObject.viewSettingsFormManager.isHidden()) {
        thisObject.viewSettingsFormManager.show(thisObject.viewSettings)
      } else {
        thisObject.viewSettingsFormManager.hide()
      }
    })

    this.versionInfoDiv.addClass('hidden')
    this.versionInfoButton.on('click', function () {
      if (thisObject.versionInfoDiv.hasClass('hidden')) {
        thisObject.versionInfoDiv.removeClass('hidden')
        thisObject.versionInfoButton.html('<i class="fas fa-angle-down" aria-hidden="true"></i>')
      } else {
        thisObject.versionInfoDiv.addClass('hidden')
        thisObject.versionInfoButton.html('<i class="fas fa-angle-right" aria-hidden="true"></i>')
      }
    })

    this.viewSettingsFormManager.on('cancel', function() {
      thisObject.viewSettingsFormManager.hide()
    })
    this.viewSettingsFormManager.on('apply', function(e) {
      thisObject.viewSettings = e.detail
      console.log('Got view settings from form')

      thisObject.ctf.setOptions(thisObject.viewSettings)
      thisObject.collationTableDiv.html(thisObject.ctf.format(thisObject.collationTableData, thisObject.popoverClass))
      thisObject.setCsvDownloadFile(thisObject.collationTableData)
      thisObject.viewSettingsFormManager.hide()
    })
    
    
    let actSettingsFormOptions = {
      containerSelector : this.editSettingsFormSelector, 
      availableWitnesses: this.availableWitnesses,
      langDef: this.options.langDef,
      urlGenerator: this.options.urlGenerator,
      userId:  this.options.userId,
      isPreset: this.options.isPreset,
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

  getVersionInfoHtml() {

    let html = ''
    html += '<ul>'
    for(const witness of this.availableWitnesses) {
      if(witness.type === 'fullTx') {
        html += '<li><b>' + witness.title + '</b>: ' +  this.formatDateTime(witness.typeSpecificInfo.timeStamp) + '</li>'
      }
    }
    html += '</ul>'

    return html
  }

  formatDateTime(sqlDateTimeString) {

    return moment(sqlDateTimeString).format('D MMM YYYY, H:mm:ss')
    // let dateTimeNoMicroseconds = sqlDateTimeString.split('.')[0];
    //
    // let date = new Date(dateTimeNoMicroseconds)
    //
    // let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep' , 'Oct', 'Nov', 'Dec']
    //
    // return date.getDay() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + ', ' + date.getHours() + ':' + this.padMinutes(date.getMinutes())
  }

  padMinutes(minutes) {
    if (minutes < 10) {
      return '0' + minutes
    }
    return minutes
  }
  
}
