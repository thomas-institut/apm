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
      showAdminInfo : { type: 'boolean', default: false},
      witnessInfo : { type: 'Array', default: []},
      collationLanguages : { type: 'Array', default: []},
      urlGenerator: { required: true, type: 'object'},
      userId: { type: 'number', default: -1 },
      witnessInfoNew :{ type: 'Array', default: []},
      authorInfo:  { type: 'object', default: []},
      pageInfo:  { type: 'object', default: []},
      languageInfo : { type: 'object', default: []},
      workInfo : { type: 'object', default: []}
    }

    let optionsChecker = new OptionsChecker(optionsDefinition, 'ChunkPage')
    this.options = optionsChecker.getCleanOptions(options)
    console.log('Chunk Page options')
    console.log(this.options)

    // some constant labels
    this.witnessTypes = {
      'full_tx' : 'Full Transcription'
    }

    this.docTypes = {
      'mss' : 'Manuscript',
      'print' : 'Print'
    }

    this.invalidErrorCodes = {
      1: 'Chunk start not defined',
      2: 'Chunk end not defined'
    }

    // selectors and classes
    this.ctLinksElement = $('#collationtablelinks')
    this.chunkIdDiv = $('#chunkid')
    this.witnessListNewDiv = $('#witnessListNew')

    // shortcuts to options
    this.pathFor = this.options.urlGenerator
    this.witnessInfo = this.options.witnessInfo
    this.collationLangs = this.options.collationLanguages
    
    this.getPresetsUrl = this.pathFor.apiGetAutomaticCollationPresets()

    this.chunkIdDiv.html(this.generateChunkIdDivHtml())
    this.witnessListNewDiv.html(this.generateWitnessListNew())

    $("#witnessTableNew").DataTable({
      paging: false,
      searching : false,
      info: false,
      columns : [
        null, //title
        null, //wtype
        null, //doctype
        null, // language
        { orderable: false}, //pages
        { orderable: false}, // info
        { orderable: false} // extra
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


    // build witness data by language
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
      }
    }

    this.updateCollationTableLinks()

    // load good witnesses (with new structure)

    for (const w in this.options.witnessInfoNew) {
      let witnessInfo = this.options.witnessInfoNew[w]
      if (!witnessInfo.isValid) {
        continue
      }
      switch (witnessInfo.type) {
        case 'full_tx':
          let docId = witnessInfo.systemId.docId
          let witnessUrl = this.pathFor.siteWitness(this.options.work, this.options.chunk, 'doc', docId, 'html')
          console.log('Loading full_tx witness ' + docId  + ' timestamp ' + witnessInfo.systemId.timeStamp )
          $('#formatted-' +docId).html('Loading text, this might take a while <i class="fas fa-spinner fa-spin fa-fw"></i> ...')
          $.get(witnessUrl)
            .done(function(data){
              console.log('Got data for full tx witness ' + docId)
              $('#formatted-' + docId).html(data)
            })
            .fail(function (resp){
              console.log('Error getting data for full tx witness ' + docId)
              console.log(resp)
              $('#formatted-' + docId).html('Error loading text')
            })
          break
        default:
          console.warn('Unsupported witness type: ' + witnessInfo.type)
      }
    }

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

  generateWitnessListNew() {
    let html = ''

    html += '<table id="witnessTableNew" class="stripe">'
    html += '<thead>'
    html += '<tr>'
    html += '<th>Title</th>'
    html += '<th>Witness Type</th>'
    html += '<th>Doc Type</th>'
    html += '<th>Language</th>'
    html += '<th>Pages</th>'
    html += '<th>Info</th>'
    html += '<th></th>'
    html += '</tr>'
    html += '</thead>'

    for(const i in this.options.witnessInfoNew) {
      let witnessInfo = this.options.witnessInfoNew[i]
      html += '<tr>'
      let docInfo = witnessInfo.typeSpecificInfo.docInfo
      html += '<td>' + this.getDocLink(docInfo) + '</td>'
      html += '<td>' + this.witnessTypes[witnessInfo.type] + '</td>'
      html += '<td>' + this.docTypes[docInfo.type] + '</td>'
      html += '<td>' + this.options.languageInfo[witnessInfo.languageCode]['name'] + '</td>'
      let info = ''
      switch (witnessInfo.type) {
        case 'full_tx':
          info = this.genFullTxInfo(witnessInfo)
          break
        default:
          info = 'Unknown witness type'
      }
      html += '<td>'+ info['location'] + '</td>'
      html += '<td>'+ info['essential'] + '</td>'
      if (this.options.showAdminInfo) {
        html += '<td>'+ info['admin'] + '</td>'
      }
      else {
        html += '<td></td>'
      }

      html += '</tr>'
    }

    return html
  }

  genFullTxInfo(witnessInfo) {

    let info = []
    let html = ''
    let docInfo = witnessInfo.typeSpecificInfo.docInfo
    let segments = witnessInfo.typeSpecificInfo.segments

    let segmentHtmlArray = []
    for(const s in segments) {
      let segmenthtml = this.genPageLink(docInfo.id, segments[s].start.pageId, segments[s].start.columnNumber)
      if (segments[s].start.pageId !==segments[s].end.pageId ) {
        segmenthtml +=  '&ndash;' +
          this.genPageLink(docInfo.id, segments[s].end.pageId, segments[s].end.columnNumber)
      }
      segmentHtmlArray.push(segmenthtml)
    }
    info['location'] = segmentHtmlArray.join(', ')

    html = ''
    let lastVersion = witnessInfo.typeSpecificInfo.lastVersion
    if (witnessInfo.isValid) {
      info['essential'] = '<small>Last change: ' + ApmUtil.formatVersionTime(lastVersion.timeFrom) + ' by ' + this.getAuthorLink(lastVersion.authorId) + '</small>'
    } else {
      info['essential'] = '<i class="fas fa-exclamation-triangle"></i> ' + this.invalidErrorCodes[witnessInfo.invalidErrorCode]
    }

    info['admin'] = '<a href="' + this.pathFor.siteWitness(this.options.work, this.options.chunk,  'doc', docInfo.id, '')+ '"><i class="fas fa-cogs" aria-hidden="true"></i></a>'
    return info
  }

  getAuthorLink(authorId) {
    return '<a href="' + this.pathFor.siteUserProfile(this.options.authorInfo[authorId].username) +
      '" title="View user profile" target="_blank">' +
      this.options.authorInfo[authorId].fullname + '</a>'
  }

  genPageLink(docId, pageId, column) {
    if (pageId === 0) {
      return '???'
    }
    let numColumns = this.options.pageInfo[pageId].numCols
    let foliation = this.options.pageInfo[pageId].foliation
    let sequence = this.options.pageInfo[pageId].sequence

    let label = foliation
    if (numColumns > 1) {
      label += ' c' + column
    }
    let url = this.pathFor.sitePageView(docId, sequence )

    return '<a href="' + url + '" title="View page ' + foliation + ' in new tab">' + label + '</a>'
  }

  getDocLink(docInfo) {
    return '<a href="' + this.pathFor.siteDocPage(docInfo.id) + '" title="View document page" target="_blank">' +
      docInfo.title + '</a>'
  }

  generateChunkIdDivHtml() {
    let html = ''

    let numWitnesses = this.options.witnessInfoNew.length
    let numValidWitnesses = this.calculateTotalValidWitnesses()
    html += '<p>'
    html += '<b>Chunk ID:</b> ' + this.options.workInfo['dare_id'] + '-' + this.options.chunk
    html += '<br/>'
    if (numWitnesses === 0) {
      html += '<b>Witnesses:</b> none'
    } else {
      html += '<b>Witnesses:</b> ' + numWitnesses + ' total, '
      html += (numValidWitnesses === numWitnesses ? ' all ' : numValidWitnesses ) + ' valid'

      if (numValidWitnesses > 0) {

        let langInfoLabels = []
        let langInfo = this.options.languageInfo
        for(const lang in langInfo) {
          if (langInfo.hasOwnProperty(lang)) {
            langInfoLabels.push((langInfo[lang]['validWitnesses'] === numValidWitnesses ? 'all' : langInfo[lang]['validWitnesses'] )+ ' ' + langInfo[lang]['name'])
          }
        }
        html += (numValidWitnesses === numWitnesses ? ', ' : ' ( ' )
        html += langInfoLabels.join(', ')
        html += (numValidWitnesses === numWitnesses ? '' : ' ) ' )
      }
    }
    html += '<br/>'
    html += '</p>'
    return html
  }

  calculateTotalValidWitnesses() {
    let langInfo = this.options.languageInfo
    let tvw = 0
    for (const lang in langInfo) {
      if (langInfo.hasOwnProperty(lang)) {
        tvw += langInfo[lang]['validWitnesses']
      }
    }
    return tvw
  }
  

  updateCollationTableLinks() {
    this.ctLinksElement.html('<ul id="ctlinks-ul"></ul>')
    for(const l in this.langs) {
      if (this.langs[l].goodWitnesses >= 2) {
        $('#ctlinks-header').removeClass('hidden')
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
