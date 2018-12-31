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
  
  constructor(urlGen, availableWitnesses, initialApiOptions, loadNow) {
    console.log('ACT mini app starting')
    console.log('Available Witnesses:')
    console.log(availableWitnesses)
    this.availableWitnesses = availableWitnesses
    this.collationTableDiv = $('#collationtablediv')
    this.status = $('#status')
    this.collationEngineDetails = $('#collationEngineDetails')
    this.redoButton = $('#redobutton')
    this.apiCollationUrl = urlGen.apiAutomaticCollation()
    this.updating = false
    this.apiCallOptions = initialApiOptions
    this.ctf = new CollationTableFormatter()
    this.popoverClass = 'ctpopover'
    this.viewSettingsForm = $('#viewsettingsform')
    this.viewSettingsButton = $('#viewsettingsbutton')
    this.viewSettingsFormCancelButton = $('#viewsettingsform-cancelbutton')
    
    this.editSettingsFormSelector = '#editsettingsform'
    this.editSettingsForm = $('#editsettingsform')
    this.editSettingsButton = $('#editsettingsbutton')
    this.editSettingsFormCancelButton = $('#editsettingsfrom-cancelbutton')
    
    let thisObject = this
    
    this.viewSettingsForm.addClass('hidden')
    this.viewSettingsButton.on('click', function () { 
      if (thisObject.viewSettingsForm.hasClass('hidden')) {
        thisObject.viewSettingsForm.removeClass('hidden')
      } else {
        thisObject.viewSettingsForm.addClass('hidden')
      }
    })
    this.viewSettingsFormCancelButton.on('click', function() {
      thisObject.viewSettingsForm.addClass('hidden')
    })
    
    
    this.editSettingsFormManager =  new AutomaticCollationTableSettingsForm(this.editSettingsFormSelector)
    
    this.editSettingsForm.addClass('hidden')
    this.editSettingsButton.on('click', function () { 
      if (thisObject.editSettingsForm.hasClass('hidden')) {
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
    this.editSettingsFormCancelButton.on('click', function() {
      thisObject.editSettingsForm.addClass('hidden')
    })
    
    
    this.collationTableDiv.html('')
    this.collationEngineDetails.html('')
    this.status.html('')
    
    this.redoButton.on('click', function() { 
      console.log('redoButton clicked')
      thisObject.getCollationTable()
    })
    if (loadNow) {
        this.getCollationTable()
    }
    
  }
  
  getCollationTable() {
    console.log('All set to call API at ' + this.apiCollationUrl)
    console.log('API call options:')
    console.log(this.apiCallOptions)
    this.updating = true
    this.redoButton.prop('disabled', true)
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
      thisObject.status.html('Collating... done, formatting table <i class="fa fa-spinner fa-spin fa-fw"></i>')
      thisObject.collationTableDiv.html(thisObject.ctf.format(data, thisObject.popoverClass))
      thisObject.status.html('')
      thisObject.redoButton.prop('disabled', false)
      thisObject.updating = false
      thisObject.collationEngineDetails.html(thisObject.getCollationEngineDetailsHtml(data.collationEngineDetails))
    })
    .fail(function(resp) {
      console.log('Error in automatic collation, resp:')
      console.log(resp)
      let failMsg = 'Collating... fail <i class="fa fa-frown-o" aria-hidden="true"></i><br/> '
      failMsg += '<span class="small">HTTP code ' + resp.status + '</span>'
      if (typeof(resp.responseJSON) !== 'undefined') {
        failMsg += '<br/><span class="small"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>&nbsp;'  + resp.responseJSON.msg + '</span>'
      }
      thisObject.status.html(failMsg)
      thisObject.updating = false
    })
  }
  
  getCollationEngineDetailsHtml(ced) {
    let cedHtml = '<b>Engine:</b> ' + ced.engineName + '<br/>'
    cedHtml += '<b>Date/Time:</b> '  + ced.runDateTime + '<br/>'
    cedHtml += '<b>Runtime:</b> ' + Math.round(ced.duration*1000.0) + ' ms'
    return cedHtml
  }
  
}
