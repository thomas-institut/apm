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
  
  constructor(urlGen, initialApiOptions, loadNow) {
    console.log('ACT mini app starting')
    this.collationTableDiv = $('#collationtablediv')
    this.status = $('#status')
    this.collationEngineDetails = $('#collationEngineDetails')
    this.apiCollationUrl = urlGen.apiAutomaticCollation()
    this.updating = false
    this.apiCallOptions = initialApiOptions
    this.ctf = new CollationTableFormatter()
    this.popoverClass = 'ctpopover'

    this.collationTableDiv.html('')
    this.collationEngineDetails.html('')
    this.status.html('')
    if (loadNow) {
        this.getCollationTable()
    }
    
  }
  
  getCollationTable() {
    console.log('All set to call API at ' + this.apiCollationUrl)
    console.log('API call options:')
    console.log(this.apiCallOptions)
    this.updating = true
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
      thisObject.updating = false
      let ced = data.collationEngineDetails
      let cedHtml = 'Engine: ' + ced.engineName + '<br/>'
      cedHtml += 'Runtime: ' + Math.round(ced.runTime*1000.0) + ' ms'
      thisObject.collationEngineDetails.html(cedHtml)
    })
    .fail(function(resp) {
      console.log('Error in automatic collation, resp:')
      console.log(resp)
      thisObject.status.html("Collating... fail with error code " + resp.status + ' :(')
      thisObject.updating = false
    })
  }
  
}
