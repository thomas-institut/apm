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

import * as Util from '../../toolbox/Util';
import {EDITION, FULL_TX} from '@/Witness/WitnessTokenClass';
import * as NormalizationSource from '../../constants/NormalizationSource';
import {ApmFormats} from './ApmFormats';
import {
  FullTxItemEditorialNote,
  FullTxItemInterface,
  WitnessInterface,
  WitnessTokenInterface
} from "@/CtData/CtDataInterface";
import {PeopleInfoObject} from "@/Api/DataSchema/ApiCollationTableAuto";

// Classes
const popoverDivClass = 'ctPopover';
const headingClass = 'heading';
const itemInfoClass = 'item-info';
const itemTextClass = 'item-text';
const itemInfoLineClass = 'item-info-line';
const itemInfoSubLineClass = 'item-info-sub-line';
const notesDivClass = 'notes';
const noteDivClass = 'note';
const noteTextClass = 'note-text';
const noteCaptionClass = 'note-caption';
const tokenAddressClass = 'tokenaddress';
const langClassPrefix = 'text-';

// Icons
const equivalentIcon = '&equiv;';
const unclearIcon = ' <i class="far fa-eye-slash"></i> ';
const deletionIcon = '&lowast; ';
const locationIcon = '<i class="fas fa-map-marker-alt"></i>';
const formatIcon = '<i class="fas fa-paint-brush"></i>';

const altTextIcon = '<span class="text-icon">ALT</span>';

export function getPopoverHtml(witnessIndex: number, tokenIndex: number, witness: WitnessInterface, postNotes: any, peopleInfo: PeopleInfoObject = []) {
  if (witness === undefined) {
    throw `Undefined witness getting popover html for witness index ${witnessIndex}, token index ${tokenIndex}`;
  }

  let token = witness['tokens'][tokenIndex];

  if (token === undefined) {
    throw `Undefined token getting popover html for witness index ${witnessIndex}, token index ${tokenIndex}`;
  }

  let popoverHtml: string;

  let lang = witness.lang || '';
  if (token['tokenClass'] === FULL_TX) {
    // @ts-expect-error sourceItems is define for FULL_TX
    let firstSourceItemIndex = token.sourceItems[0]['index'];
    // @ts-expect-error sourceItems is define for FULL_TX
    if (witness.items[firstSourceItemIndex]['lang'] !== undefined) {
      // @ts-expect-error sourceItems is define for FULL_TX
      lang = witness.items[firstSourceItemIndex]['lang'];
    }
  }
  // console.log("Lang: " + lang)
  let langClass = langClassPrefix + lang;
  popoverHtml = `<div class="${popoverDivClass}">`;

  // the text
  popoverHtml += `<p class="${[headingClass, langClass].join(' ')}">${token.text}`;
  if (token['normalizedText'] !== undefined && token['normalizedText'] !== '') {
    switch (token['normalizationSource']) {
      case NormalizationSource.AUTOMATIC_COLLATION:
      case NormalizationSource.COLLATION_EDITOR_AUTOMATIC:
        popoverHtml += `<br/><span class="standard-norm">${equivalentIcon} ${token['normalizedText']}</span><br/>`;
        break;

      case NormalizationSource.PARSER_NORMALIZER:
        popoverHtml += `<br/><span class="standard-norm">${equivalentIcon} ${token['normalizedText']}</span><br/>`;
        popoverHtml += `<br/><span class="normalizer-warning text-la">Normalized by parser</span>`;
        popoverHtml += `<br/><span class="normalizer-warning text-la">Edit in Main Text panel</span>`;
        break;

      default:
        popoverHtml += `<br/>${equivalentIcon} ${token['normalizedText']}<br/>`;
    }

  }
  popoverHtml += '</p>';

  // item info
  if (token.tokenClass === FULL_TX) {
    const theItems = witness.items || [];
    if (token.sourceItems === undefined) {
      return '';
    }
    if (token.sourceItems.length === 1) {
      popoverHtml += `<div class="${[itemInfoClass, langClass].join(' ')}">`;

      popoverHtml += getItemPopoverHtmlForToken(witnessIndex, token, token.sourceItems[0], peopleInfo, theItems, false);
      popoverHtml += '</div>';
    } else {
      for (const itemData of token.sourceItems) {
        popoverHtml += `<div class="${[itemInfoClass, langClass].join(' ')}">`;
        popoverHtml += getItemPopoverHtmlForToken(witnessIndex, token, itemData, peopleInfo, theItems, true);
        popoverHtml += '</div>';
      }
    }
    // token address
    popoverHtml += `<p class="${tokenAddressClass}">`;
    popoverHtml += getTokenAddressHtml(witnessIndex, token, theItems);
    popoverHtml += '</p>';

    if (postNotes.length > 0) {
      // console.log(`There are notes in token ${witnessIndex}:${tokenIndex}`)
      popoverHtml += getNotesHtml(postNotes, peopleInfo, 'Additional Notes');
    }
  }
  if (token['tokenClass'] === EDITION) {
    if (token['tokenType'] === 'numberingLabel') {
      popoverHtml += `<div class='${itemInfoClass}'>Numbering label</div>`;
    }
  }
  popoverHtml += '</div>';
  return popoverHtml;
}


export function getTokenAddressHtml(row: number, token: WitnessTokenInterface, items: FullTxItemInterface[] = []): string {
  let html = '';
  let itemWithAddressArray = items;
  if (token.sourceItems === undefined) {
    return '';
  }
  let itemData = token['sourceItems'][0];
  let itemWithAddress = itemWithAddressArray[itemData['index']];

  let page = itemWithAddress.address.foliation;
  let column: string | number = 0;
  if (token.textBox !== undefined) {
    if (typeof (token.textBox) === 'number') {
      column = token.textBox;
    } else {
      console.info('Found a token with a textBox range in row ' + row);
      console.log(token);
      column = token.textBox.from;
    }
  }

  let line = '';
  if (column > 10) {
    // this is a marginal really
    column = 'margin';
  } else {
    if (token.line !== undefined) {
      if (typeof (token.line) === 'number') {
        line = token.line.toString();
      } else {
        line = token.line.from + '-' + token.line.to;
      }
    }
  }

  html += '<b>Page: </b>' + page + '</br>';
  html += '<b>Column: </b>' + column + '</br>';
  if (line !== '') {
    html += '<b>Line: </b>' + line + '</br>';
  }

  return html;
}

export function getItemPopoverHtmlForToken(row: number, token: WitnessTokenInterface, tokenSourceItemData: any, peopleInfo: PeopleInfoObject, items: FullTxItemInterface[], showItemText = false) {

  let normalizationLabels: { [key: string]: string} = {
    'sic': 'Sic', 'abbr': 'Abbreviation'
  };
  let itemIndex = tokenSourceItemData['index'];
  let item = items[itemIndex];

  if (item === undefined) {
    let errorMsg = `Undefined item getting popover html for token, row ${row}, itemIndex ${itemIndex}`;
    console.error(errorMsg);
    console.log(tokenSourceItemData);
    throw errorMsg;
  }
  let tokenItemText = '';
  if (item['text'] !== undefined) {
    tokenItemText = item['text'].substring(tokenSourceItemData['charRange'].from, tokenSourceItemData['charRange'].to + 1);
  }
  if (item.type !== 'TextualItem') {
    return '';
  }
  if (tokenItemText === "\n") {
    return '';
  }

  let html = '';
  if (showItemText) {
    html += `<p class="${itemTextClass}">${tokenItemText}</p>`;
  }
  let isNormalText = true;

  function getItemInfoLineP(infoLine: string, subLines: string[] = []) {
    let html = `<p class="${itemInfoLineClass}">${infoLine}</p>`;
    for (const subLine of subLines) {
      html += `<p class="${itemInfoSubLineClass}">${subLine}</p>`;
    }
    return html;
  }

  if (item.hand !== undefined) {
    html += getItemInfoLineP(genEnglishTextSpan('<b>Hand: </b>' + (item.hand + 1)));
  }
  if (item.format !== undefined) {
    html += getItemInfoLineP(`${formatIcon} ${genEnglishTextSpan(item.format)}`);
    isNormalText = false;
  }
  if (item.clarity === 0) {
    html += getItemInfoLineP(`<b>${genEnglishTextSpan('Illegible')}</b>`, [unclearIcon + genEnglishTextSpan(item.clarityReason ?? '')]);
    isNormalText = false;
  }
  if (item.clarity === 0.5) {
    let subLines = [];
    subLines.push(unclearIcon + genEnglishTextSpan(item.clarityReason ?? ''));
    if (item.alternateTexts !== undefined) {
      for (const altText of item.alternateTexts) {
        subLines.push(`${altTextIcon} ${altText}`);
      }
    }
    html += getItemInfoLineP(`<b>${genEnglishTextSpan('Unclear')}</b>`, subLines);
    isNormalText = false;
  }

  if (item['textualFlow'] === 1) {
    html += getItemInfoLineP(`<b>${genEnglishTextSpan('Addition')}</b>`, [`${locationIcon} ${genEnglishTextSpan(item.location || '')}`]);
    isNormalText = false;
  }
  if (item.deletion !== undefined) {
    html += getItemInfoLineP(`<b>${genEnglishTextSpan('Deletion')}</b>`, [deletionIcon + genEnglishTextSpan(item.deletion)]);
    isNormalText = false;
  }
  if (item.normalizationType !== undefined) {
    let normLabel = item.normalizationType;
    if (normalizationLabels[normLabel] !== undefined) {
      normLabel = normalizationLabels[normLabel];
    }
    let subLines = [];

    subLines.push('+ ' + tokenItemText);
    if (token.normalizedText === undefined || token.normalizedText === tokenItemText) {
      subLines.push('= ' + '(no reading given)');
    } else {
      subLines.push('= ' + token.normalizedText);
    }
    html += getItemInfoLineP('<b>' + normLabel + '</b>', subLines);
    isNormalText = false;
  }
  if (isNormalText) {
    html += getItemInfoLineP(genEnglishTextSpan('Normal Text'));
  }

  // notes
  if (item['notes'] !== undefined && item['notes'].length > 0) {
    html += getNotesHtml(item.notes, peopleInfo, 'Notes');
  }

  return html;

}

function genEnglishTextSpan(text: string) {
  return `<span class="${langClassPrefix}en">${text}</span>`;
}

function getNotesHtml(notes: FullTxItemEditorialNote[], peopleInfo: PeopleInfoObject, title = 'Notes') {
  let html = '';
  html += `<div class="${notesDivClass}">`;
  html += `<h1>${genEnglishTextSpan(title)}</h1>`;
  for (const note of notes) {
    html += getNoteHtml(note, peopleInfo);
  }
  html += '</div>';
  return html;
}

function getNoteHtml(note: FullTxItemEditorialNote, peopleInfo: PeopleInfoObject) {
  let html = `<div class="${noteDivClass} ${langClassPrefix}en">`;
  let authorShortName = 'Unknown';
  if (peopleInfo[note.authorTid] === undefined) {
    console.warn(`No author info for user Id ${note.authorTid}`);
  } else {
    authorShortName = peopleInfo[note.authorTid]['shortName'];
    if (authorShortName === undefined) {
      //console.warn(`No short name defined for author ${note.authorId}`)
      authorShortName = peopleInfo[note.authorTid]['name'];
    }
  }


  html += `<p class="${noteTextClass}">${Util.escapeHtml(note.text)}</p>`;
  html += `<p class="${noteCaptionClass}">-- ${authorShortName}, ${formatNoteTime(note.timeStamp)}</p>`;
  html += '</div>';
  return html;
}

function formatNoteTime(timeStamp: string) {
  return ApmFormats.timeString(timeStamp, {withSeconds: false});
}

