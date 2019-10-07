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

/**
 * Mini JS app running in the Chunk Page
 */
class ChunkPage {

  constructor(options) {

    let optionsDefinition = {
      work : { required: true, type: 'string'},
      chunk : { required: true, type: 'NumberGreaterThanZero' },
      witnessInfo : { type: 'Array', default: []},
      collationLanguages : { type: 'Array', default: []},
      urlGenerator: { required: true, type: 'object'},
      userId: { type: 'number', default: -1 }
    }

    let optionsChecker = new OptionsChecker(optionsDefinition, 'ChunkPage')
    this.options = optionsChecker.getCleanOptions(options)
    console.log('Chunk Page options')
    console.log(this.options)
    
    this.includeInCollationButtonClass = 'includeincollation'
    this.ctLinksElement = $('#collationtablelinks')
    
    this.pathFor = this.options.urlGenerator
    this.witnessInfo = this.options.witnessInfo
    console.log(this.witnessInfo)
    this.collationLangs = this.options.collationLanguages
    
    this.getPresetsUrl = this.pathFor.apiGetAutomaticCollationPresets()

    $("#theWitnessTable").DataTable({ 
        paging: false, 
        searching : false, 
        sDom:'t',
        columns : [
            null, //title
            null, //type
            null, //language
            null, // pages
            null, // last changed
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
      w.type = 'doc' // eventually witnesses will be of different types
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
          $('#formatted-' + w.id).html('Loading text, this might take a while <i class="fas fa-spinner fa-spin fa-fw"></i> ...')
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
            placement: 'auto',
            sanitize: false
         })
  }
  

  
  updateCollationTableLinks() {
    this.ctLinksElement.html('<ul id="ctlinks-ul"></ul>')
    for(const l in this.langs) {
      if (this.langs[l].goodWitnesses >= 2) {
        let urls = []
        let langName = this.langs[l].name
        let insideListId = 'ct-links-ul-' + l
        $('#ctlinks-ul').append('<li>' + langName + '</li>')
        $('#ctlinks-ul').append('<ul id="' + insideListId + '"></ul>')
        urls.push(
             { 
               lang: l,
               name: langName,
               url:  this.pathFor.siteCollationTable(this.options.work, this.options.chunk, l),
               urltext: 'All witnesses',
               urltitle: 'Open automatic collation table in new tab',
               availableWitnesses: this.langs[l].availableWitnesses,
               isPreset: false,
               actSettings : { 
                 lang: l,
                 work: this.options.work,
                 chunk: this.options.chunk,
                 ignorePunctuation: true,
                 witnesses: this.langs[l].availableWitnesses
               }
               
             })
        // get applicable presets
        let thisObject = this
        let apiCallOptions = {
          lang: this.langs[l].code,
          userId: false,
          witnesses: []
        }
        for(const w of this.langs[l].availableWitnesses) {
          apiCallOptions.witnesses.push(parseInt(w.id))
        }
        //console.log('Calling presets API')
        //console.log(apiCallOptions)
        $.post(
          this.getPresetsUrl, 
          { data: JSON.stringify(apiCallOptions) }
        )
        .done(function (data) { 
          //console.log('Presets retrieved for ' + langName + ' in ' + data.runTime + 'ms')
          //console.log('Got ' + data.presets.length + ' presets')
          //console.log(data.presets)
          for(const pr of data.presets) {
            let witnessesToInclude = []
            for (const wId of pr.data.witnesses) {
              let witness = false
              for(const w of thisObject.witnessInfo) {
                if (w.id === wId) {
                  witness = w
                }
              }
              if (witness === false) {
                console.error('Witness in preset not found in witnesses available, this must NEVER happen!')
                return false
              }
              witnessesToInclude.push(witness)
            }
            urls.push(
             { 
               lang: l,
               name: langName,
               url:  thisObject.pathFor.siteCollationTablePreset(thisObject.options.work, thisObject.options.chunk, pr.presetId),
               urltext: pr.title + ' <small><i>(' + pr.userName + ')</i></small>',
               urltitle:  'Open collation table in new tab', 
               availableWitnesses: thisObject.langs[l].availableWitnesses,
               isPreset: true,
               preset: { 
                 id: pr.presetId, 
                 title: pr.title, 
                 userId: pr.userId, 
                 userName: pr.userName,
                 editable: (pr.userId === thisObject.options.userId)
               },
               actSettings : { 
                 lang: l,
                 work: thisObject.options.work,
                 chunk: thisObject.options.chunk,
                 ignorePunctuation: pr.data.ignorePunctuation,
                 witnesses: witnessesToInclude
               }
               
             })
          }
          thisObject.fillCollationTableLinks(urls, insideListId)
        })
        .fail(function(resp) {
          console.log('Failed API call for presets for ' + langName, ' status: ' + resp.status)
          console.log(resp)
          thisObject.fillCollationTableLinks(urls, insideListId)
        })
      }
    }
  }
  
  fillCollationTableLinks(urls, containerId) {
    if (urls.length !== 0 ) {
      $('#ctlinks-header').removeClass('hidden')
      let html = ''
      html += '<ul>'
      for(const u in urls) {
        let liId = containerId + '-' +  u
        html += '<li id="' + liId + '">'
        html += urls[u].urltext + ':'
        html += '<a class="button btn btn-default btn-sm noborder" id="' + liId + '-a' + '" href="' + urls[u].url + '" title="' + urls[u].urltitle + '" target="_blank">' 
        html += '<i class="fas fa-external-link-alt"></i>' + '</a>'
        html += '<button title="Edit automatic collation settings" '
        html += 'class="ctsettingsbutton btn btn-default btn-sm noborder">'
        html += '<i class="fas fa-pencil-alt" aria-hidden="true"></i></button>'
        if (urls[u].preset) {
          if (urls[u].preset.userId === this.options.userId) {
            html += '<button title="Erase preset" '
            html += 'class="cterasepresetbutton btn btn-default btn-sm noborder">'
          html += '<i class="fas fa-trash" aria-hidden="true"></i></button>'
          html += '<div id="' + liId + '-erasediv' + '"></div>'
          }
        }
        
        html += '<div id="' + liId + '-div' + '" class="actsettings"></div>'
        html += '</li>'
      }
      html += '</ul>'
      
      $('#' + containerId).html(html)
      for (const u in urls) {
        let liId = containerId + '-' +  u
        let ctSettingsFormManager =  new AutomaticCollationTableSettingsForm({
          containerSelector : '#' + liId + '-div', 
          initialSettings: urls[u].actSettings,
          availableWitnesses: urls[u].availableWitnesses,
          hideTitle: true,
          isPreset: urls[u].isPreset,
          preset: urls[u].preset,
          applyButtonText: 'Generate Collation',
          urlGenerator: this.options.urlGenerator,
          userId: this.options.userId
        })
       $('#' + liId  + ' .cterasepresetbutton').on('click', function() { 
            $('#' + liId + '-a').addClass('disabled')
            $('#' + liId + ' .ctsettingsbutton').addClass('disabled')
            $('#' + liId + ' .cterasepresetbutton').addClass('disabled')
          let divSelector = '#' + liId + '-erasediv'
          let eraseHtml = '<p class="bg-danger">Do you really want to erase this preset?'
          eraseHtml += '<button class="btn btn-sm btn-default button-yes">Yes</button>'
          eraseHtml += '<button class="btn btn-sm btn-default button-no">No</button>'
          $(divSelector).html(eraseHtml)
          $(divSelector +  ' .button-no').on('click', function(){
            $(divSelector).html('')
            $('#' + liId + '-a').removeClass('disabled')
            $('#' + liId + ' .cterasepresetbutton').removeClass('disabled')
            $('#' + liId + ' .ctsettingsbutton').removeClass('disabled')
          })
          $(divSelector +  ' .button-yes').on('click', function(){
            $.get(
              thisObject.pathFor.apiDeletePreset(urls[u].preset.id)
            )
            .done( function (data){
              thisObject.updateCollationTableLinks()
            })
            .fail(function(resp) {
              console.error('Cannot delete preset')
              console.log(resp)
            })
            
          })
          
        })
        
        $('#' + liId  + ' .ctsettingsbutton').on('click', function() { 
          if (ctSettingsFormManager.isHidden()) {
            $('#' + liId + '-a').addClass('disabled')
            $('#' + liId + ' .cterasepresetbutton').addClass('disabled')
            ctSettingsFormManager.show()
          } else {
            ctSettingsFormManager.hide()
            $('#' + liId + '-a').removeClass('disabled')
            $('#' + liId + ' .cterasepresetbutton').removeClass('disabled')
          }
        })
        ctSettingsFormManager.on('cancel', function (){
          ctSettingsFormManager.hide()
          $('#' + liId + '-a').removeClass('disabled')
           $('#' + liId + ' .cterasepresetbutton').removeClass('disabled')
        })
        let thisObject = this
        ctSettingsFormManager.on('apply', function (e) {
          console.log('Opening automatic collation table')
          console.log(e.detail)
          $('body').append('<form id="theform" method="POST" target="_blank" action="' +  
                  thisObject.pathFor.siteCollationTableCustom(thisObject.options.work, thisObject.options.chunk, urls[u].lang) + '">' +
                  '<input type="text" name="data" value=\'' + JSON.stringify({options: e.detail})  + '\'></form>')
          $('#theform').submit()
        })
        ctSettingsFormManager.on('preset-new', function(){
          thisObject.updateCollationTableLinks()
        })
      }
    }
  }
  

  
}
