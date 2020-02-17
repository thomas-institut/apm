/* 
 *  Copyright (C) 2020 Universität zu Köln
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
      urlGenerator: { required: true, type: 'object'},
      userId: { type: 'number', default: -1 },
      witnessInfo :{ type: 'Array', default: []},
      authorInfo:  { type: 'object', default: []},
      pageInfo:  { type: 'object', default: []},
      languageInfo : { type: 'object', default: []},
      workInfo : { type: 'object', default: []},
      validChunks : {type: 'Array', default: []}
    }

    let optionsChecker = new OptionsChecker(optionsDefinition, 'ChunkPage')
    this.options = optionsChecker.getCleanOptions(options)
    console.log('Chunk Page options')
    console.log(this.options)


    // some constant labels
    this.witnessTypeLabels = {}
    this.witnessTypeLabels[WitnessTypes.FULL_TX] = 'Full Transcription'

    this.docTypes = {
      'mss' : 'Manuscript',
      'print' : 'Print'
    }

    this.invalidErrorCodes = {
      1: 'Chunk start not defined',
      2: 'Chunk end not defined',
      3: 'Chunk start after chunk end',
      4: 'Duplicate chunk start marks',
      5: 'Duplicate chunk end marks'
    }

    // selectors and classes
    this.ctLinksElement = $('#collationtablelinks')
    this.chunkIdDiv = $('#chunkid')
    this.witnessListNewDiv = $('#witnessListNew')
    this.witnessPanelsDiv = $('#witnesspanels')
    this.headerDiv = $('#chunkpageheader')

    // shortcuts to options
    this.pathFor = this.options.urlGenerator

    this.getPresetsUrl = this.pathFor.apiGetAutomaticCollationPresets()

    this.headerDiv.html(this.generateHeaderDivHtml())
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

    // build witness data by language
    this.witnessesByLang = {}
    for (const w in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(w)){
        continue
      }
      let witnessInfo = this.options.witnessInfo[w]
      if (witnessInfo.type !==WitnessTypes.FULL_TX) {
        // TODO: support other witness types!
        continue
      }
      let fullTxInfo = witnessInfo["typeSpecificInfo"];
      let title = fullTxInfo.docInfo.title
      let lwid = fullTxInfo["localWitnessId"]
      if (lwid !== 'A') {
        title += ' (' + lwid + ')'
      }
      let witness = witnessInfo
      witness.index = parseInt(w)
      witness.title = title
      // let witness = {
      //   index:  parseInt(w),
      //   type: witnessInfo.type,
      //   id: witnessInfo["typeSpecificInfo"].docId,
      //   lwid : lwid,
      //   title: title,
      //   systemId: witnessInfo.systemId
      // }
      if (witnessInfo.isValid) {
        if (this.witnessesByLang[witnessInfo.languageCode] === undefined) {
          this.witnessesByLang[witnessInfo.languageCode] = []
        }
        this.witnessesByLang[witnessInfo.languageCode].push(witness)
        let toggleButton = new CollapseToggleButton($('#texttoggle-' + witness.systemId), $('#text-' + witness.systemId))
      }
    }
    console.log('Witnesses by lang')
    console.log(this.witnessesByLang)

    this.updateCollationTableLinks()

    this.witnessPanelsDiv.html(this.generateWitnessPanelHtml())

    // load good witnesses into panels

    for (const w in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(w)) {
        continue
      }
      let witnessInfo = this.options.witnessInfo[w]
      if (!witnessInfo.isValid) {
        continue
      }
      switch (witnessInfo.type) {
        case WitnessTypes.FULL_TX:
          let witnessUrl = this.pathFor.apiWitnessGet(witnessInfo.systemId, 'html')
          console.log('Loading witness ' + witnessInfo.systemId)
          let formattedSelector = '#formatted-' + witnessInfo.systemId
          $(formattedSelector).html('Loading text, this might take a while <i class="fas fa-spinner fa-spin fa-fw"></i> ...')
          $.get(witnessUrl)
            .done(function(data){
              console.log('Got data for fullTx witness ' + witnessInfo.systemId)
              $(formattedSelector).html(data)
            })
            .fail(function (resp){
              console.log('Error getting data for fullTx witness ' + witnessInfo.systemId)
              console.log(resp)
              $(formattedSelector).html('Error loading text')
            })
          break

        case WitnessTypes.PARTIAL_TX:
          console.log('Partial TX witness not supported yet!')
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

  getPreviousChunk(chunk, validChunks) {
    let index = validChunks.findIndex(function(c) { return c===chunk })
    if (index===0) {
      return -1;
    }
    return validChunks[index-1]
  }

  getNextChunk(chunk, validChunks) {
    let index = validChunks.findIndex(function(c) { return c===chunk })
    if (index===(validChunks.length-1)) {
      return -1;
    }
    return validChunks[index+1]
  }

  generateHeaderDivHtml() {
    let html = ''
    let arrowLeft = '<i class="fas fa-angle-left"></i>'
    let arrowRight = '<i class="fas fa-angle-right"></i>'

    html += '<div class="row row-no-gutters">'

    html += '<div class="col-md-11 cpheader">'
    //let url = this.pathFor.siteChunkPage(this.options.work, this.options.chunk-1)

    let prevChunk = this.getPreviousChunk(this.options.chunk, this.options.validChunks)
    if (prevChunk !== -1) {
      let url = this.pathFor.siteChunkPage(this.options.work, prevChunk)
      html += '<a role="button" class="btn-default" title="Go to chunk ' + prevChunk + '" href="' + url +
        '">'+ arrowLeft + '</a>'
      html += '&nbsp;&nbsp;'
    }

    html += this.options.workInfo['author_name'] + ', <em>' +
        this.options.workInfo['title'] + '</em>, chunk ' + this.options.chunk
    html += '</div>'

    html += '<div class="col-md1 cpheader justifyright">'
    let nextChunk = this.getNextChunk(this.options.chunk, this.options.validChunks)
    if (nextChunk !== -1) {
      let url = this.pathFor.siteChunkPage(this.options.work, nextChunk)
      html += '<a role="button" class="btn-default" title="Go to chunk ' + nextChunk + '" href="' + url +
        '">'+ arrowRight + '</a>'
    }
    html += '</div>'

    html += '</div>'
    return html
  }

  generateWitnessPanelHtml() {

    let twigTemplate = Twig.twig({
      id: 'witnessPanels',
      data: `
  <div class="panel panel-default">
      <div class="panel-heading">
      <h3 class="panel-title">{{title}}
        &nbsp;&nbsp;&nbsp;
    <a role="button" title="Click to show/hide text" data-toggle="collapse" href="#text-{{witnessSystemId}}" aria-expanded="true" aria-controls="text-{{witnessSystemId}}">
      <span id="texttoggle-{{id}}-{{lwid}}"><i class="fas fa-angle-right" aria-hidden="true"></i></span>
    </a></h3>
    </div>
    <div class="collapse" id="text-{{witnessSystemId}}">
      <div class="panel-body">
      <p class="formattedchunktext chunktext-{{lang}}" id="formatted-{{witnessSystemId}}"></p>
      </div>
      </div>
      </div>
`
    })

    let html = ''
    for (const w in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(w)) {
        continue
      }
      let witnessInfo = this.options.witnessInfo[w]
      if (!witnessInfo.isValid) {
        continue
      }
      switch (witnessInfo.type) {
        case WitnessTypes.FULL_TX:
          let lwid = witnessInfo.typeSpecificInfo.localWitnessId
          let title =  witnessInfo["typeSpecificInfo"].docInfo.title
          if (lwid !== 'A') {
            title += ' (' + lwid + ')'
          }
          html += twigTemplate.render({
            title: title,
            witnessSystemId : witnessInfo.systemId,
            lang: witnessInfo["typeSpecificInfo"].docInfo.languageCode
          })
          break
      }
    }
    return html
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

    for(const i in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(i)) {
        continue
      }
      let witnessInfo = this.options.witnessInfo[i]
      html += '<tr>'
      let docInfo = witnessInfo["typeSpecificInfo"].docInfo
      let lwid = witnessInfo.typeSpecificInfo.localWitnessId
      html += '<td>' + this.getDocLink(docInfo)
      if (lwid !== 'A') {
        html += ' (' + lwid + ')'
      }
      html += '</td>'
      html += '<td>' + this.witnessTypeLabels[witnessInfo.type] + '</td>'
      html += '<td>' + this.docTypes[docInfo.type] + '</td>'
      html += '<td>' + this.options.languageInfo[witnessInfo.languageCode]['name'] + '</td>'
      let info = ''
      switch (witnessInfo.type) {
        case WitnessTypes.FULL_TX:
          info = this.genFullTxInfo(witnessInfo)
          break

        case WitnessTypes.PARTIAL_TX:
          info = { 'location' : 'tbd', 'essential': 'based on TBD', 'admin' : ''}
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
    let docInfo = witnessInfo["typeSpecificInfo"].docInfo
    let segments = witnessInfo["typeSpecificInfo"].segments

    let segmentHtmlArray = []
    for(const s in segments) {
      if (!segments.hasOwnProperty(s)) {
        continue
      }
      let segmenthtml = this.genPageLink(docInfo.id, segments[s].start.pageId, segments[s].start.columnNumber)
      if (segments[s].start.pageId !==segments[s].end.pageId ) {
        segmenthtml +=  '&ndash;' +
          this.genPageLink(docInfo.id, segments[s].end.pageId, segments[s].end.columnNumber)
      }
      segmentHtmlArray.push(segmenthtml)
    }
    info['location'] = segmentHtmlArray.join(', ')

    let lastVersion = witnessInfo.typeSpecificInfo.lastVersion
    if (witnessInfo.isValid) {
      info['essential'] = '<small>Last change: ' + ApmUtil.formatVersionTime(lastVersion.timeFrom) + ' by ' + this.getAuthorLink(lastVersion.authorId) + '</small>'
    } else {
      let errorMsg = this.invalidErrorCodes[witnessInfo.errorCode]
      if (errorMsg === undefined) {
        errorMsg = 'Error code ' + witnessInfo.errorCode
      }
      info['essential'] = '<i class="fas fa-exclamation-triangle"></i> ' + errorMsg
    }

     if (witnessInfo.isValid) {
       info['admin'] = '<a href="' + this.pathFor.apiWitnessGet(witnessInfo.systemId, 'full') + '" target="_blank"><i class="fas fa-cogs" aria-hidden="true"></i></a>'
     } else {
       info['admin'] = ''
     }


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
    let url = this.pathFor.sitePageView(docId, sequence , column)

    return '<a href="' + url + '" title="View page ' + foliation + ' col ' + column + ' in new tab" + target="_blank">' + label + '</a>'
  }

  getDocLink(docInfo) {
    return '<a href="' + this.pathFor.siteDocPage(docInfo.id) + '" title="View document page" target="_blank">' +
      docInfo.title + '</a>'
  }

  generateChunkIdDivHtml() {
    let html = ''

    let numWitnesses = this.options.witnessInfo.length
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
    let langInfo = this.options.languageInfo
    let ctLinksUl = $('#ctlinks-ul')
    for(const l in langInfo) {
      if (!langInfo.hasOwnProperty(l)) {
        continue
      }
      if (langInfo[l].validWitnesses >= 2) {
        $('#ctlinks-header').removeClass('hidden')
        let urls = []
        let langName = langInfo[l].name
        let insideListId = 'ct-links-ul-' + l
        ctLinksUl.append('<li>' + langName + '</li>')
        ctLinksUl.append('<ul id="' + insideListId + '"></ul>')
        urls.push(
             { 
               lang: l,
               name: langName,
               url:  this.pathFor.siteCollationTable(this.options.work, this.options.chunk, l),
               urltext: 'All witnesses',
               urltitle: 'Open automatic collation table in new tab',
               availableWitnesses: this.witnessesByLang[l],
               isPreset: false,
               actSettings : { 
                 lang: l,
                 work: this.options.work,
                 chunk: this.options.chunk,
                 ignorePunctuation: true,
                 witnesses: this.witnessesByLang[l]
               }
               
             })
        // get applicable presets
        let thisObject = this
        let apiCallOptions = {
          lang: langInfo[l].code,
          userId: false,
          witnesses: []
        }
        for(const w in this.witnessesByLang[l]) {
          if (!this.witnessesByLang[l].hasOwnProperty(w)) {
            continue
          }
          // try to match fullTx witnesses with localWitness Id === 'A'
          // TODO: support other localWitnessId
          let witness = this.witnessesByLang[l][w]
          if (witness.type === 'fullTx') {
            if (witness.typeSpecificInfo.localWitnessId === 'A') {
              apiCallOptions.witnesses.push(witness.typeSpecificInfo.docId)
            }
          }
        }
        console.log('Getting presets')
        console.log(apiCallOptions)
        $.post(
          this.getPresetsUrl, 
          { data: JSON.stringify(apiCallOptions) }
        )
        .done(function (data) { 
          console.log('Presets retrieved for ' + langName + ' in ' + data.runTime + 'ms')
          console.log('Got ' + data.presets.length + ' presets')
          console.log(data.presets)
          for(const pr of data.presets) {
            let witnessesToInclude = []
            for (const wId of pr.data.witnesses) {
              let witness = false

              for(const w of thisObject.witnessesByLang[l]) {
                // match only fullTx witnesses with localWitnessId === 'A'
                if (w.type=== 'fullTx' && w.typeSpecificInfo.docId === wId && w.typeSpecificInfo.localWitnessId === 'A') {
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
               availableWitnesses: thisObject.witnessesByLang[l],
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
        if (!urls.hasOwnProperty(u)) {
          continue
        }
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
        if (!urls.hasOwnProperty(u)) {
          continue
        }
        let liId = containerId + '-' +  u
        console.log('Creating new ACTS form on html ID ' + liId)
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
          let formElement = $('#theform')
          if (formElement.length !== 0) {
            //console.log('Removing hidden form')
            formElement.remove()
          }
          //console.log('Adding hidden form')
          $('body').append('<form id="theform" class="hidden" method="POST" target="_blank" action="' +
                  thisObject.pathFor.siteCollationTableCustom(thisObject.options.work, thisObject.options.chunk, urls[u].lang) + '">' +
                  '<input type="text" name="data" value=\'' + JSON.stringify({options: e.detail})  + '\'></form>')
          //console.log('Submitting')
          document.getElementById('theform').submit()
        })
        ctSettingsFormManager.on('preset-new', function(){
          thisObject.updateCollationTableLinks()
        })
      }
    }
  }
  

  
}
