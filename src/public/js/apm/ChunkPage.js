/*
 * Copyright (C) 2018-19 Universität zu Köln
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

/* eslint-env jquery */

class ChunkPage {
  
  constructor(options) {
    
    this.options = this.getCleanOptions(options)
    
    this.includeInCollationButtonClass = 'includeincollation'
    this.ctLinksElement = $('#collationtablelinks')
    
    this.pathFor = this.options.urlGenerator
    this.witnessInfo = this.options.witnessInfo
    console.log(this.witnessInfo)
    this.collationLangs = this.options.collationLanguages

    $("#theWitnessTable").DataTable({ 
        paging: false, 
        searching : false, 
        sDom:'t',
        columns : [
            null, //title
            null, //type
            null, //language
            null, // pages
            { orderable: false } // show/hide text
        ]
    })
    
    this.langs = {}
    for (const lang of this.collationLangs) {
      this.langs[lang.code] = {
        name: lang.name, 
        code: lang.code, 
        goodWitnesses: 0,
        availableWitnesses: []
      }
    }
    
    
    for (const w of this.witnessInfo) {
      if (this.langs[w.lang] === undefined) {
        // QUESTION: should this happen at all?
        console.log('Undefined language un chunkpage langs: ' + w.lang)
        this.langs[w.lang] = { name: w.lang, code: w.lang, goodWitnesses:0 }  // TODO: pass all language info 
      }
      if (w.goodWitness) {
        this.langs[w.lang].goodWitnesses++
        this.langs[w.lang].availableWitnesses.push(w)
        let toggleButton = new CollapseToggleButton($('#texttoggle-' + w.id), $('#text-' + w.id))
        if (!w.delayLoad) {
          $('#formatted-' + w.id).html(w.formatted)
        } else {
          console.log('Getting delayed data for witness ' + w.id)
          $('#formatted-' + w.id).html('Loading text, this might take a while <i class="fa fa-spinner fa-spin fa-fw"></i> ...')
          $.get(this.pathFor.siteWitness(this.options.work, this.options.chunk, 'doc', w.id, 'html'))
                  .done(function(data){
                     console.log('Got data for witness ' + w.id)
                     $('#formatted-' + w.id).html(data)
                  })
                  .fail(function (resp){
                    console.log('Error getting data for witness ' + w.id)
                    console.log(resp)
                     $('#formatted-' + w.id).html('Error loading text')
                  }) 
        }
      }
    }
    
    this.updateCollationTableLinks()
    
    $('body').popover({
            container: 'body', 
            html: true,
            trigger: 'hover', 
            selector: '.withformatpopover',
            delay: {show: 500, hide: 0},
            placement: 'auto'
         })
  }
  
  getDefaultOptions() {
    let options = {}
    
    options.work = 'no-work'
    options.chunk = 0
    options.witnessInfo = []
    options.collationLanguages = []
    options.urlGenerator = {}
    return options
  }
  
  getCleanOptions(inputOptions) {
    
    let cleanOptions = this.getDefaultOptions()
    
    if (typeof(inputOptions.work) === 'string') {
      cleanOptions.work = inputOptions.work
    }
    
    if (typeof(inputOptions.chunk) === 'number' && inputOptions.chunk > 0) {
      cleanOptions.chunk = inputOptions.chunk
    }
    
    if (typeof(inputOptions.witnessInfo) === 'object') {
      cleanOptions.witnessInfo = inputOptions.witnessInfo
    }
    
    if (typeof(inputOptions.collationLanguages) === 'object') {
      cleanOptions.collationLanguages = inputOptions.collationLanguages
    }
    
    if (typeof(inputOptions.urlGenerator) === 'object') {
      cleanOptions.urlGenerator = inputOptions.urlGenerator
    }
    return cleanOptions
  }
  
  updateCollationTableLinks() {
    let urls = []
    for(const l in this.langs) {
      if (this.langs[l].goodWitnesses >= 2) {
        urls.push(
             { 
               lang: l,
               name: this.langs[l].name,
               url:  this.pathFor.siteCollationTable(this.options.work, this.options.chunk, l),
               urltext: this.langs[l].name + ', all witnesses',
               availableWitnesses: this.langs[l].availableWitnesses,
               preset: false
               
             })
        // TODO: retrieve applicable presets for this language and add links
      }
    }
    this.ctLinksElement.html('')
    
    if (urls.length !== 0 ) {
      let html = ''
      html += '<ul>'
      for(const u in urls) {
        let title="Open collation table in new tab"
        html += '<li id="ctlink-li-' + u + '">'
        html += '<a href="' + urls[u].url + '" title="' + title + '" target="_blank">' + urls[u].urltext + '</a>'
        html += '<button title="Click to edit the automatic collation settings" '
        html += 'class="ctsettingsbutton btn btn-default btn-sm noborder">'
        html += '<i class="fa fa-pencil" aria-hidden="true"></i></button>'
        html += '<div class="ctsettingsform"></div>'
        html += '</li>'
      }
      html += '</ul>'
      this.ctLinksElement.html(html)
      
      
      for (const u in urls) {
        let ctSettingsFormManager =  new AutomaticCollationTableSettingsForm({
          containerSelector : '#ctlink-li-' + u + ' .ctsettingsform', 
          availableWitnesses: urls[u].availableWitnesses
        })
        $('#ctlink-li-' + u +  ' .ctsettingsbutton').on('click', function() { 
          if (ctSettingsFormManager.isHidden()) {
            ctSettingsFormManager.show()
          } else {
            ctSettingsFormManager.hide()
          }
          
        })
      }
    }
    
    
  }
  

  
}
