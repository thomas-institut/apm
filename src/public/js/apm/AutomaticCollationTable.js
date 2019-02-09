/*
 * Copyright (C) 2016-18 Universität zu Köln
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

class AutomaticCollationTable {
  
  constructor(options, initialApiOptions) {
    console.log('ACT mini app starting')
    console.log('Available Witnesses:')
    console.log(options.availableWitnesses)
    
    this.rtlClass = 'rtltext'
    this.ltrClass = 'ltrtext'
    
    
    this.options = this.getCleanOptionsObject(this.getDefaultOptions(), options)
    
    this.availableWitnesses = this.options.availableWitnesses
    this.collationTableDiv = $('#collationtablediv')
    this.actTitleElement = $('#act-title')
    this.status = $('#status')
    this.collationEngineDetails = $('#collationEngineDetails')
    this.redoButton = $('#redobutton')
    this.exportCsvButton = $('#exportcsvbutton')
    this.apiCollationUrl = this.options.urlGen.apiAutomaticCollation()
    this.updating = false
    this.apiCallOptions = initialApiOptions
    this.collationTableData = null
    this.ctf = new CollationTableFormatter({lang: initialApiOptions.lang})
    this.popoverClass = 'ctpopover'
    
    this.viewSettingsFormSelector = '#viewsettingsform'
    this.viewSettingsButton = $('#viewsettingsbutton')
    this.viewSettings = this.ctf.getOptions()
    
    this.editSettingsFormSelector = '#editsettingsform'
    this.editSettingsButton = $('#editsettingsbutton')
    
    let thisObject = this
    
    this.viewSettingsFormManager = new AutomaticCollationTableViewSettingsForm(this.viewSettingsFormSelector)
    this.viewSettingsButton.on('click', function () { 
      if (thisObject.viewSettingsFormManager.isHidden()) {
        thisObject.viewSettingsFormManager.show(thisObject.viewSettings)
      } else {
        thisObject.viewSettingsFormManager.hide()
      }
    })
    this.viewSettingsFormManager.on('cancel', function() {
      thisObject.viewSettingsFormManager.hide()
    })
    this.viewSettingsFormManager.on('apply', function(e) {
      thisObject.viewSettings = e.detail
      console.log('Got view settings from form')
//      console.log(thisObject.viewSettings)
//      
      thisObject.ctf.setOptions(thisObject.viewSettings)
      thisObject.collationTableDiv.html(thisObject.ctf.format(thisObject.collationTableData, thisObject.popoverClass))
      thisObject.setCsvDownloadFile(thisObject.collationTableData)
      thisObject.viewSettingsFormManager.hide()
    })
    
    
    this.editSettingsFormManager =  new AutomaticCollationTableSettingsForm(this.editSettingsFormSelector)
    
    this.editSettingsButton.on('click', function () { 
      if (thisObject.editSettingsFormManager.isHidden()) {
        thisObject.editSettingsFormManager.show(thisObject.availableWitnesses, thisObject.apiCallOptions)
      } else {
        thisObject.editSettingsFormManager.hide()
      }
    })
    
    this.editSettingsFormManager.on('cancel', function(){
        thisObject.editSettingsFormManager.hide()
    })
                
    this.editSettingsFormManager.on('apply', function(e){
        thisObject.apiCallOptions = e.detail
        console.log('Got options from form:')
        console.log(thisObject.apiCallOptions)
        thisObject.editSettingsFormManager.hide()
        thisObject.getCollationTable()
    })

    
    
    this.collationTableDiv.html('')
    this.collationEngineDetails.html('')
    this.status.html('')
    this.actTitleElement.html(this.getTitleFromOptions())
    
    this.redoButton.on('click', function() { 
      console.log('redoButton clicked')
      thisObject.getCollationTable()
    })
    if (this.options.loadNow) {
        this.getCollationTable()
    }
  }
  
  
  getDefaultOptions() {
    let options = {}
    
    options.langDef = { 
       la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3},
       ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3},
       he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3}
     } 
    options.availableWitnesses = []
    options.loadNow = false
    options.urlGen = null
    
    return options
  }
  
  getCleanOptionsObject(defaultOptions, options) {
    let cleanOptions = defaultOptions
    
    if (typeof(options.langDef) === 'object') {
      cleanOptions.langDef = options.langDef
    }
    
    if (typeof(options.availableWitnesses) === 'object') {
      cleanOptions.availableWitnesses = options.availableWitnesses
    }
    
    if (typeof(options.loadNow) === 'boolean') {
      cleanOptions.loadNow = options.loadNow
    }
    
    if(typeof(options.urlGen) === 'object'){
      cleanOptions.urlGen = options.urlGen
    }
    
    return cleanOptions
    
  }
  
  getTitleFromOptions() {
    let title = ''
    
    let numWitnesses = this.apiCallOptions.witnesses.length
    if (numWitnesses === 0) {
      numWitnesses = this.availableWitnesses.length
    }
    
    title += this.options.langDef[this.apiCallOptions.lang].name + ', '
    title += numWitnesses  + ' of ' 
    title += this.availableWitnesses.length + ' witnesses'
    
    if (this.apiCallOptions.ignorePunctuation) {
      title += ', ignoring punctuation'
    }
        
    return title
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
      
      // EXPERIMENTAL
      let ev = new EditionViewer(
              data.quickEdition.mainTextTokens, 
              data.quickEdition.apparatusArray , 
              data.quickEdition.textDirection === 'rtl', // rightToLeft?
              false  // don't add glue
              
      )
      
      $('#editionviewer').html(ev.getHtml())
      
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
    cedHtml += '<b>Total Runtime:</b>' + Math.round(ced.totalDuration*1000.0) + ' ms'
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
  
}
