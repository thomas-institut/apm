/*
 *  Copyright (C) 2019-20 Universität zu Köln
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

import * as Util from './toolbox/Util'

// Classes
const popoverDivClass = 'ctPopover'
const headingClass = 'heading'
const itemInfoClass = 'item-info'
const itemTextClass = 'item-text'
const itemInfoLineClass = 'item-info-line'
const itemInfoSubLineClass = 'item-info-sub-line'
const notesDivClass = 'notes'
const noteDivClass = 'note'
const noteTextClass = 'note-text'
const noteCaptionClass = 'note-caption'
const tokenAddressClass = 'tokenaddress'
const langClassPrefix = 'text-'

// Icons
const equivalentIcon = '&equiv;'
const unclearIcon = ' <i class="far fa-eye-slash"></i> '
const deletionIcon = '&lowast; '
const locationIcon = '<i class="fas fa-map-marker-alt"></i>'
const formatIcon = '<i class="fas fa-paint-brush"></i>'

const altTextIcon = '<span class="text-icon">ALT</span>'

export function getPopoverHtml(witnessIndex, tokenIndex, witness, postNotes, peopleInfo) {
  if (witness === undefined) {
    throw `Undefined witness getting popover html for witness index ${witnessIndex}, token index ${tokenIndex}`
  }

  let token = witness['tokens'][tokenIndex]

  if (token === undefined) {
    throw `Undefined token getting popover html for witness index ${witnessIndex}, token index ${tokenIndex}`
  }

  let popoverHtml = ''

  let firstSourceItemIndex = token['sourceItems'][0]['index']
  let lang = witness['lang']
  if (witness['items'][firstSourceItemIndex]['lang'] !== undefined) {
    lang = witness['items'][firstSourceItemIndex]['lang']
  }
  // console.log("Lang: " + lang)
  let langClass = langClassPrefix  + lang
  popoverHtml = `<div class="${popoverDivClass}">`

  // the text
  popoverHtml += `<p class="${[headingClass, langClass].join(' ')}">${token.text}`
  if (token['normalizedText'] !== undefined) {
    popoverHtml += `<br/>${equivalentIcon} ${token['normalizedText']}<br/>`
  }
  popoverHtml += '</p>'

  // item info

  if (token['sourceItems'].length === 1) {
    popoverHtml += `<div class="${[itemInfoClass, langClass].join(' ')}">`
    popoverHtml += getItemPopoverHtmlForToken(witnessIndex, token, token['sourceItems'][0], peopleInfo, witness['items'], false)
    popoverHtml += '</div>'
  } else {
    for (const itemData of token['sourceItems']) {
      popoverHtml += `<div class="${[itemInfoClass, langClass].join(' ')}">`
      popoverHtml += getItemPopoverHtmlForToken(witnessIndex, token, itemData, peopleInfo, witness['items'], true)
      popoverHtml += '</div>'
    }
  }
  // token address
  popoverHtml += `<p class="${tokenAddressClass}">`
  popoverHtml += getTokenAddressHtml(witnessIndex, token, witness['items'])
  popoverHtml += '</p>'

  if (postNotes.length > 0) {
    popoverHtml += getNotesHtml(postNotes, peopleInfo, 'Additional Notes')
  }
  popoverHtml += '</div>'

  return popoverHtml
}



export function getTokenAddressHtml(row, token, items) {
  let html = ''
  let itemWithAddressArray = items
  let itemData = token['sourceItems'][0]
  let itemWithAddress = itemWithAddressArray[itemData['index']]

  let page = itemWithAddress['address'].foliation
  let column
  if (typeof(token['textBox']) === 'number') {
    column = token['textBox']
  } else {
    console.info('Found a token with a textBox range in row ' + row)
    console.log(token)
    column = token['textBox'].from
  }
  let line = ''
  if (column > 10) {
    // this is a marginal really
    column = 'margin'
  } else {
    if (typeof(token.line) === 'number') {
      line = token.line
    } else {
      line = token.line.from + '-' + token.line.to
    }
  }

  html += '<b>Page: </b>' + page + '</br>'
  html += '<b>Column: </b>' + column + '</br>'
  if (line !== -1) {
    html += '<b>Line: </b>' + line + '</br>'
  }

  return html
}

export function getItemPopoverHtmlForToken(row, token, tokenSourceItemData, peopleInfo, items, showItemText = false) {

  let normalizationLabels = {
    'sic' : 'Sic',
    'abbr' : 'Abbreviation'
  }
  let itemIndex = tokenSourceItemData['index']
  let item = items[itemIndex]

  if (item === undefined) {
    let errorMsg = `Undefined item getting popover html for token, row ${row}, itemIndex ${itemIndex}`
    console.error(errorMsg)
    console.log(tokenSourceItemData)
    throw errorMsg
  }
  let tokenItemText = ''
  if (item['text'] !== undefined) {
    tokenItemText = item['text'].substring(tokenSourceItemData['charRange'].from, tokenSourceItemData['charRange'].to+1)
  }
  if (item.type !== 'TextualItem') {
    return ''
  }
  if (tokenItemText === "\n") {
    return ''
  }

  let html = ''
  let indentHtml = ''
  if (showItemText) {
    html += `<p class="${itemTextClass}">${tokenItemText}</p>`
  }
  let isNormalText = true

  function getItemInfoLineP(infoLine, subLines = []) {
    let html = `<p class="${itemInfoLineClass}">${infoLine}</p>`
    for(const subLine of subLines) {
      html += `<p class="${itemInfoSubLineClass}">${subLine}</p>`
    }
    return html
  }
  if (item.hand !== undefined) {
    html += getItemInfoLineP( genEnglishTextSpan('<b>Hand: </b>' + (item.hand +1)))
  }
  if (item.format !== undefined) {
    html += getItemInfoLineP(`${formatIcon} ${genEnglishTextSpan(item.format)}`)
    isNormalText = false
  }
  if (item['clarity'] === 0) {
    html += getItemInfoLineP(
      `<b>${genEnglishTextSpan('Illegible')}</b>`,
      [ unclearIcon + genEnglishTextSpan(item['clarityReason']) ]
    )
    isNormalText = false
  }
  if (item['clarity'] === 0.5) {
    let subLines = []
    subLines.push(unclearIcon + genEnglishTextSpan(item['clarityReason']) )
    if (item['alternateTexts'] !== undefined) {
      for(const altText of item['alternateTexts']) {
        subLines.push(`${altTextIcon} ${altText}`)
      }
    }
    html += getItemInfoLineP(`<b>${genEnglishTextSpan('Unclear')}</b>`, subLines)
    isNormalText = false
  }

  if (item['textualFlow'] === 1) {
    html += getItemInfoLineP(`<b>${genEnglishTextSpan('Addition')}</b>`, [  `${locationIcon} ${genEnglishTextSpan(item.location)}` ])
    isNormalText = false
  }
  if (item.deletion !== undefined) {
    html += getItemInfoLineP(`<b>${genEnglishTextSpan('Deletion')}</b>`, [  deletionIcon + genEnglishTextSpan(item.deletion)])
    isNormalText = false
  }
  if (item['normalizationType'] !== undefined) {
    let normLabel = item['normalizationType']
    if (normalizationLabels[item['normalizationType']] !== undefined) {
      normLabel = normalizationLabels[item['normalizationType']]
    }
    let subLines = []

    subLines.push( '+ ' + tokenItemText)
    if (token['normalizedText'] === undefined || token['normalizedText'] === tokenItemText) {
      subLines.push('= ' + '(no reading given)')
    } else {
      subLines.push('= ' + token['normalizedText'])
    }
    html += getItemInfoLineP('<b>' + normLabel + '</b>' , subLines)
    isNormalText = false
  }
  if (isNormalText) {
    html += getItemInfoLineP(genEnglishTextSpan('Normal Text'))

  }

  // notes
  if (item['notes'] !== undefined && item['notes'].length > 0) {
    html += getNotesHtml(item['notes'], peopleInfo, 'Notes')
  }
  //console.log(`Generated popover html: '${html}'`)

  return html

}

function genEnglishTextSpan(text) {
  return `<span class="${langClassPrefix}en">${text}</span>`
}

function getNotesHtml(notes, peopleInfo, title = 'Notes') {
  let html = ''
  html += `<div class="${notesDivClass}">`
  html += `<h1>${genEnglishTextSpan(title)}</h1>`
  for(const note of notes) {
    html += getNoteHtml(note, peopleInfo)
  }
  html += '</div>'
  return html
}

function getNoteHtml(note, peopleInfo) {
  let html = `<div class="${noteDivClass} ${langClassPrefix}en">`
  let authorShortName = peopleInfo[note.authorId]['shortName']
  if (authorShortName === undefined) {
    //console.error(`No short name defined for author ${note.authorId}`)
    authorShortName = peopleInfo[note.authorId]['fullname']
  }

  html += `<p class="${noteTextClass}">${Util.escapeHtml(note.text)}</p>`
  html += `<p class="${noteCaptionClass}">-- ${authorShortName}, ${formatNoteTime(note.timeStamp)}</p>`
  html += '</div>'
  return html
}

function formatNoteTime(timeStamp) {
  return moment(timeStamp).format('D MMM YYYY, H:mm')
}

