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

class CollationTableEditor {
  collationTable;

  constructor(options) {

    let optionsDefinition = {
      collationTableData : { type: 'object', required: true},
      workId : { type: 'string', required: true},
      chunkNumber: {type: 'NonZeroNumber', required: true},
      tableId: { type: 'NonZeroNumber', required: true},
      langDef : { type: 'object', default: {
          la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3},
          ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3},
          he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3}
        }
      },
      availableWitnesses: { type: 'Array', default: [] },
      urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true},
      workInfo: { type: 'object', default: [] },
      peopleInfo: { type: 'object', default: [] },
      docInfo: { type: 'object', default: [] }
    }

    let oc = new OptionsChecker(optionsDefinition, "EditCollationTable")
    this.options = oc.getCleanOptions(options)

    this.ctData = this.options['collationTableData']
    this.lastSavedCtData = $.extend({}, this.ctData)
    this.tableId = this.options['tableId']


    // DOM elements
    this.ctTitleDiv = $('#collationtabletitle')
    this.ctTitleEditButton = $('#cttitleedit')

    this.ctInfoDiv = $('#collationtableinfo')
    this.ctActionsDiv = $('#collationtableactions')
    this.breadcrumbCtTitleSpan = $('#breadcrumb-cttitle')
    this.witnessesDiv = $('#witnessesdiv')
    this.ctDiv = $('#collationtablediv')
    this.quickEditionDiv = $('#editiondiv')
    this.saveAreaDiv = $('#save-area')
    this.saveButton = $('#savebutton')

    let thisObject = this
    this.ctTitleDiv.on('mouseenter', function () {
      thisObject.ctTitleEditButton.removeClass('hidden')
    })
    this.ctTitleDiv.on('mouseleave', function () {
      thisObject.ctTitleEditButton.addClass('hidden')
    })


    this.titleField = new EditableTextField({
      containerSelector: '#cttitletext',
      initialText: this.ctData['title'],
      onConfirm: this.genOnConfirmTitleField()
    })


    this.breadcrumbCtTitleSpan.html("Saved Collation Table")
    this.updateSaveArea()
    this.ctInfoDiv.html(this.genCtInfoDiv())

    this.witnessesDiv.html(this.genWitnessesDivHtml())
    this.quickEditionDiv.html('Quick edition coming soon...')
    this.ctDiv.html('Collation table coming soon...')

    this.saveButton.on('click', this.genOnClickSaveButton())
  }

  genOnClickSaveButton() {
    let thisObject = this
    return function() {
      if (thisObject.changesInCtData()) {
        console.log('Saving changes...')

      }
    }
  }

  genWitnessesDivHtml() {
    let html = ''

    html+= '<table class="witnesstable">'
    html+= '<tr><th>Witness</th><th>Version used</th><th>Siglum</th></tr>'

    for(let i = 0; i < this.ctData['witnesses'].length; i++) {
      let witness = this.ctData['witnesses'][i]
      let siglum = this.ctData['sigla'][i]
      let docTitle = this.options.docInfo[witness['docId']]['title']
      html += '<tr>'
      html += '<td>' + docTitle + '</td>'
      html += '<td>' + ApmUtil.formatVersionTime(witness['timeStamp']) + '</td>'
      html += '<td>'+ siglum + '</td>'
      html += '</tr>'
    }
    return html
  }

  updateSaveArea() {
    if (this.changesInCtData()) {
      this.saveButton.removeClass('hidden')
    } else {
      this.saveButton.addClass('hidden')
    }
  }

  changesInCtData() {
    //console.log(this.ctData['title'])
    //console.log(this.lastSavedCtData['title'])
    if (this.ctData['title'] !== this.lastSavedCtData['title']) {
      return true
    }
    return false
  }

  genOnConfirmTitleField() {
    let thisObject = this
    return function (data) {
      console.log('confirm title field')
      console.log(data.detail)
      if (data.detail.newText !== data.detail.oldText) {
        let normalizedNewTitle = thisObject.normalizeTitleString(data.detail.newText)
        if (normalizedNewTitle === '') {
          console.debug('Empty new title')
          thisObject.titleField.setText(thisObject.ctData['title'])
          return false
        }
        console.debug('New title: ' + normalizedNewTitle)
        thisObject.ctData['title'] = normalizedNewTitle
        thisObject.titleField.setText(normalizedNewTitle)
        thisObject.updateSaveArea()
      }
      return false
    }
  }

  normalizeTitleString(title) {

    return title.replace(/^\s*/, '').replace(/\s*$/, '')

  }

  genCtInfoDiv() {
    let html = ''

    let workTitle = this.options.workInfo['title']
    let workAuthorId = this.options.workInfo['authorId']
    let workAuthorName = this.options.peopleInfo[workAuthorId]['fullname']

    html += '<p>' + workAuthorName + ', <i>' + workTitle + '</i>, chunk ' +  this.options.chunkNumber + '</p>'
    html += '<p>Chunk ID: ' + this.options.workId + '-' + this.options.chunkNumber + '</p>'
    html += '<p>Table ID: ' + this.tableId + '</p>'
    return html
  }



}