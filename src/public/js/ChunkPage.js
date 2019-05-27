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
      }
    }
    this.updateCollationTableLinks()
    
    $('.' + this.includeInCollationButtonClass).on('click', this.genOnIicButtonClick())
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
    let html = 'Collation Tables: '
    if (urls.length === 0 ) {
      html += '<i>Choose at least 2 witnesses in one language to generate collation table(s)</i>'
      this.ctLinksElement.html(html)
    } else {
      for(const u in urls) {
        let title="Open collation table in new tab"
        if (urls[u].isPartial) {
          title="Open partial collation table in new tab"
        }
        html += '<a href="' + urls[u].url + '" title="' + title + '" target="_blank">' + urls[u].name + '</a>&nbsp;'
      }
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
