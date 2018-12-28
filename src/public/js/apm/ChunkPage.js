/*
 * Copyright (C) 2018 Universität zu Köln
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
  
  constructor(options, witnessInfo, collationLangs, urlGenerator) {
    this.pathFor = urlGenerator
    this.options = options
    this.includeInCollationButtonClass = 'includeincollation'
    this.ctLinksElement = $('#collationtablelinks')
    this.witnessInfo = witnessInfo
    console.log(this.witnessInfo)
    this.collationLangs = collationLangs
    
    $("#theWitnessTable").DataTable({ 
        'paging': false, 
        'searching' : false, 
        'sDom':'t',
        columns : [
            null, //title
            null, //type
            null, //language
            null, // pages
            { orderable: false }, // include in collation
            { orderable: false }, // show/hide text
        ]
    })
    
    this.langs = {}
    for (const lang of this.collationLangs) {
      this.langs[lang.code] = {name: lang.name, code: lang.code, goodWitnesses: 0}
    }
    
    for (const w of this.witnessInfo) {
      if (this.langs[w.lang] === undefined) {
        this.langs[w.lang] = { name: w.lang, code: w.lang, goodWitnesses:0 }  // TODO: pass all language info 
      }
      if (w.goodWitness) {
        this.langs[w.lang].goodWitnesses++
        let toggleButton = new CollapseToggleButton($('#texttoggle-' + w.id), $('#text-' + w.id))
      }
    }
    this.updateCollationTableLinks()
    
    $('.' + this.includeInCollationButtonClass).on('click', this.genOnIicButtonClick())
    
    
    $('body .withformatpopover').popover({
            container: 'body', 
            html: true,
            trigger: 'hover', 
            delay: {show: 500, hide: 0},
            placement: 'auto'
         })
  }
  
  getWitnessesToIncludeInCollation() {
    let iicButtons = $('input.' + this.includeInCollationButtonClass)
    let ids = {}
    for(const lang in this.langs) {
      ids[lang] =[]
    }
    
    for(const button of iicButtons) {
      let id = $(button).attr('value')
      if ($(button).is(':checked')) {
        let split = id.split('-')
        ids[split[1]].push(parseInt(split[0]))
      }
    }
    return ids
  }
  
  updateCollationTableLinks() {
    let w = this.getWitnessesToIncludeInCollation()
    let urls = []
    for (const l in w) {
      if (w[l].length >= 2) {
        if (w[l].length !== this.langs[l].goodWitnesses) {
          urls.push(
             { 
               lang: l,
               name: this.langs[l].name,
               isPartial: true,
               url:  this.pathFor.siteCollationTable(this.options.work, this.options.chunkno, l, w[l])
             })
        } else {
           urls.push(
             { 
               lang: l,
               name: this.langs[l].name,
               isPartial: false,
               url:  this.pathFor.siteCollationTable(this.options.work, this.options.chunkno, l)
             })
        }

      }
    }
    let html = '<h4>Automatic Collation Tables</h4>'
    if (urls.length === 0 ) {
      html += '<i>Choose at least 2 witnesses in one language to generate collation table(s)</i>'
      this.ctLinksElement.html(html)
    } else {
      html += '<ul>'
      for(const u in urls) {
        let title="Open collation table in new tab"
        let urltext = urls[u].name + ', all witnesses'
        if (urls[u].isPartial) {
          title="Open partial collation table in new tab"
          urltext = urls[u].name + ', marked witnesses'
        }
        html += '<li><a href="' + urls[u].url + '" title="' + title + '" target="_blank">' + urltext + '</a></li>'
      }
      html += '</ul>'
      this.ctLinksElement.html(html)
    }
  }
  
  genOnIicButtonClick() {
    let thisObject = this
    return function(e) {
      thisObject.updateCollationTableLinks()
    }
  }
  
}