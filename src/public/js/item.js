/*
 * Copyright (C) 2017 Universität zu Köln
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

const ITEM_TEXT = 1
const ITEM_RUBRIC = 2
const ITEM_SIC = 3
const ITEM_UNCLEAR = 4
const ITEM_ILLEGIBLE = 5
const ITEM_GLIPH = 6
const ITEM_ADDITION = 7
const ITEM_DELETION = 8
const ITEM_MARK = 9
const ITEM_NO_LINEBREAK = 10
const ITEM_ABBREVIATION = 11
const ITEM_LINEBREAK = 12
const ITEM_INITIAL = 13
const ITEM_UNSUPPORTED = 9999

class Item {
  static getItemSpan (item, itemHasEdnotes) {
    let htmlId = 'item' + item.id
    let classes = ''
    if (itemHasEdnotes) {
      classes += 'hasednote '
    }

    if (Item.realGetItemSpan[item.type] === undefined) {
      return Item.realGetItemSpan[ITEM_UNSUPPORTED](item, classes, htmlId)
    }
    return Item.realGetItemSpan[item.type](item, classes, htmlId)
  };

  static getItemPopover (item, ednotes, people, colNumber, elementId) {
    let popover = {}

    if (Item.realGetItemPopover[item.type] === undefined) {
      popover = Item.realGetItemPopover[ITEM_UNSUPPORTED]()
    } else {
      popover = Item.realGetItemPopover[item.type](item)
    }
    popover['text'] = '<div class="popoverinfo">' + popover['text'] + '</div>'
    popover['text'] += Item.getItemPopoverEdnoteText(item, ednotes, people)
    return popover
  };

  static getItemPopoverEdnoteText (item, ednotes, people) {
    let t = '<div class="tooltip-notes">'
    for (let k = 0; k < ednotes.length; k++) {
      if (ednotes[k]['target'] === item.id) {
        t += '<blockquote><p>' + ednotes[k]['text'] + '</p>'
        t += '<footer>' +
                        people[ednotes[k]['authorId']]['fullname'] +
                        ' @ ' +
                        ednotes[k]['time'] + '</footer>'
        t += '</blockquote>'
      }
    }
    t += '</div>'
    return t
  }

  static getValidDeletionTechniques () {
    return ['dot-above',
      'dot-above-dot-under',
      'dots-above',
      'dots-underneath',
      'strikeout']
  }

  static getValidAdditionPlaces () {
    return ['above',
      'below',
      'inline',
      'inspace',
      'overflow']
  }

  static getValidUnclearReasons () {
    return ['unclear',
      'damaged']
  }

  static getValidIllegibleReasons () {
    return ['damaged',
      'illegible']
  }
};

/*
 * Item Spans
 */
Item.realGetItemSpan = []

Item.realGetItemSpan[ITEM_TEXT] = function (item, classes, htmlId) {
  classes = classes + 'regulartext'
  return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="Text">' + item.theText + '</span>'
}

Item.realGetItemSpan[ITEM_RUBRIC] = function (item, classes, htmlId) {
  classes = classes + 'rubric'
  return '<span class="' + classes +
            '" title="Rubric" id="' + htmlId + '">' +
            item.theText + '</span>'
}

Item.realGetItemSpan[ITEM_SIC] = function (item, classes, htmlId) {
  classes = classes + 'sic'
  let t = item.altText
  if (t === '') {
    t = item.theText
  }
  return '<span class="' + classes +
            '" id="' + htmlId + '" title="Sic">' +
            t + '</span>'
}

Item.realGetItemSpan[ITEM_ABBREVIATION] = function (item, classes, htmlId) {
  classes = classes + 'abbr'
  let t = item.altText
  if (t === '') {
    t = item.theText
  }
  return '<span class="' + classes +
            '" id="' + htmlId + '" title="Abbreviation">' +
            t + '</span>'
}

Item.realGetItemSpan[ITEM_MARK] = function (item, classes, htmlId) {
  classes = classes + 'mark'
  return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="Inline Note">' +
            '<span class="glyphicon ' +
            'glyphicon-exclamation-sign"></span></span>'
}

Item.realGetItemSpan[ITEM_NO_LINEBREAK] = function (item, classes, htmlId) {
  classes = classes + 'nolb'
  return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="No linebreak">--</span>'
}

Item.realGetItemSpan[ITEM_LINEBREAK] = function (item, classes, htmlId) {
  classes = classes + 'linebreak'
  return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="Linebreak">//</span>'
}

Item.realGetItemSpan[ITEM_UNCLEAR] = function (item, classes, htmlId) {
  classes = classes + 'unclear'
  return '<span class="' + classes +
            '" id="' + htmlId + '" title="Unclear Text">' +
            item.theText + '</span>'
}

Item.realGetItemSpan[ITEM_ILLEGIBLE] = function (item, classes, htmlId) {
  classes = classes + 'illegible'
  let t = '🈑'.repeat(item.length)
  return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="Illegible Text">' + t + '</span>'
}

Item.realGetItemSpan[ITEM_GLIPH] = function (item, classes, htmlId) {
  classes = classes + 'gliph'
  return '<span class="' + classes +
            '" id="' + htmlId + '" title="Gliph">' +
            item.theText + '</span>'
}

Item.realGetItemSpan[ITEM_INITIAL] = function (item, classes, htmlId) {
  classes = classes + 'initial'
  return '<span class="' + classes +
            '" id="' + htmlId + '" title="Initial">' +
            item.theText + '</span>'
}

Item.realGetItemSpan[ITEM_ADDITION] = function (item, classes, htmlId) {
  classes = classes + 'addition'
  if (item.extraInfo === 'above') {
    classes += ' addition-above'
  }
  return '<span class="' + classes +
            '" id="' + htmlId + '" title="Addition">' +
            item.theText + '</span>'
}

Item.realGetItemSpan[ITEM_DELETION] = function (item, classes, htmlId) {
  classes = classes + 'deletion'
  return '<span class="' + classes +
            '" id="' +
            htmlId +
            '" title="Deletion">' +
            item.theText + '</span>'
}

Item.realGetItemSpan[ITEM_UNSUPPORTED] = function (item, classes, htmlId) {
  console.log('Unsupported item type ' + item.type +
            ', wrapping it on a default class')
  classes = classes + ' unknownitemtype'
  return '<span class="' +
            classes + '" id="' + htmlId +
            '" title="Unsupported">' + item.theText + '</span>'
}

/*
 * Item tooltips
 */

Item.realGetItemPopover = []

Item.realGetItemPopover[ITEM_TEXT] = function (item) {
  return PopoverFactory.createSimpleTextualPopover('text', 'Text', item.theText)
}

Item.realGetItemPopover[ITEM_RUBRIC] = function (item) {
  return PopoverFactory.createSimpleTextualPopover('rubric', 'Rubric', item.theText)
}

Item.realGetItemPopover[ITEM_GLIPH] = function (item) {
  return PopoverFactory.createSimpleTextualPopover('gliph', 'Gliph', item.theText)
}

Item.realGetItemPopover[ITEM_NO_LINEBREAK] = function (item) {
  return PopoverFactory.createSimpleTextualPopover('nolb', '', '')
}

Item.realGetItemPopover[ITEM_MARK] = function (item) {
  return PopoverFactory.createSimpleTextualPopover('ednote', '', '')
}

Item.realGetItemPopover[ITEM_SIC] = function (item) {
  return PopoverFactory.createPopoverWithAltText('sic',
        'Original', item.theText,
        'Correction', item.altText)
}

Item.realGetItemPopover[ITEM_ABBREVIATION] = function (item) {
  return PopoverFactory.createPopoverWithAltText('abbr',
        'Original', item.theText,
        'Expansion', item.altText)
}

Item.realGetItemPopover[ITEM_UNCLEAR] = function (item) {
  return PopoverFactory.createPopoverWithExtraInfo('unclear',
        'Text', '???',
        'Alternative', item.altText,
        'Reason', item.extraInfo)
}

Item.realGetItemPopover[ITEM_ILLEGIBLE] = function (item) {
  let popover = PopoverFactory.createPopoverWithExtraInfo('illegible',
        'Text', '<illegible>',
        'Alternative', '',
        'Reason', item.extraInfo)

  popover['text'] += '<br/><b>Length:</b> ' + item.length + ' characters'
  return popover
}

Item.realGetItemPopover[ITEM_ADDITION] = function (item) {
  return PopoverFactory.createPopoverWithExtraInfo('add',
        'Added Text', item.theText,
        '', '',
        'Place', item.extraInfo)
}

Item.realGetItemPopover[ITEM_DELETION] = function (item) {
  return PopoverFactory.createPopoverWithExtraInfo('add',
        'Deleted Text', item.theText,
        '', '',
        'Technique', item.extraInfo)
}

Item.realGetItemPopover[ITEM_UNSUPPORTED] = function (item) {
  return {}
}

class PopoverFactory {
  static createSimpleTextualPopover (type, label, text) {
    let popover = {}
    popover['type'] = type
    if (text === '') {
      popover['text'] = ''
    } else {
      popover['text'] = '<b>' + label + ':</b> ' + text
    }
    return popover
  }

  static createPopoverWithAltText (type, label, text, altLabel, altText) {
    let popover = PopoverFactory.createSimpleTextualPopover(type, label, text)
    if (altText !== '') {
      popover['text'] += '<br/><b>' + altLabel + ':</b> ' + altText
    }
    return popover
  }

  static createPopoverWithExtraInfo (type, label, text, altLabel, altText, extraLabel, extraInfo) {
    let popover = PopoverFactory.createPopoverWithAltText(type, label, text, altLabel, altText)
    if (extraInfo !== '') {
      popover['text'] += '<br/><b>' + extraLabel + ':</b> ' + extraInfo
    }
    return popover
  }
}
