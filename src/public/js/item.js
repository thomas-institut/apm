/* 
 * Copyright (C) 2016-7 Universität zu Köln
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

itemDef = {};

const ITEM_TEXT = 1;
const ITEM_RUBRIC = 2;
const ITEM_SIC = 3;
const ITEM_UNCLEAR = 4;
const ITEM_ILLEGIBLE = 5;
const ITEM_GLIPH = 6;
const ITEM_ADDITION = 7;
const ITEM_DELETION = 8;
const ITEM_MARK = 9;
const ITEM_NO_LINEBREAK = 10;
const ITEM_ABBREVIATION = 11;
const ITEM_UNSUPPORTED = 9999;

function getItemSpan(item, itemHasEdnotes)
{
    
    htmlId = 'item' + item.id;
    classes = '';
    if (itemHasEdnotes) {
        classes += 'hasednote ';
    }
    
    if (itemDef.realGetItemSpan[item.type] === undefined) {
        return itemDef.realGetItemSpan[ITEM_UNSUPPORTED](item, classes, htmlId);
    }
    return itemDef.realGetItemSpan[item.type](item, classes, htmlId);
};

function getItemPopover(item, ednotes, people, colNumber, elementId) 
{
    var popover;
    
    if (itemDef.realGetItemPopover[item.type] === undefined) {
        popover = itemDef.realGetItemPopover[ITEM_UNSUPPORTED](item, classes, htmlId);
    }
    else {
        popover = itemDef.realGetItemPopover[item.type](item);
    }
    popover['text']=  '<div class="popoverinfo">' +  popover['text'] + '</div>';
    popover['text'] += getItemPopoverEdnoteText(item, ednotes, people);
    return popover;
};

function getItemPopoverEdnoteText(item, ednotes, people)
{
    t = '<div class="tooltip-notes">';
    for (k = 0; k < ednotes.length; k++) {
        if (ednotes[k]['target'] === item.id) {
            t += '<blockquote><p>' + ednotes[k]['text'] + '</p>';
            t += '<footer>' +
                    people[ednotes[k]['authorId']]['fullname'] +
                    ' @ ' +
                    ednotes[k]['time'] + '</footer>';
            t += '</blockquote>';
        }
    }
    t += '</div>';
    return t;
    
}


/*
 * Item Spans
 */
itemDef.realGetItemSpan = [];

itemDef.realGetItemSpan[ITEM_TEXT] = function (item, classes, htmlId)
{
    classes = classes + 'regulartext';
    return  '<span class="' + classes +
            '" id="' + htmlId +
            '" title="Text">' + item.theText + '</span>';
};

itemDef.realGetItemSpan[ITEM_RUBRIC] = function (item, classes, htmlId)
{
    classes = classes + 'rubric';
    return '<span class="' + classes +
            '" title="Rubric" id="' + htmlId + '">' +
            item.theText + '</span>';
};

itemDef.realGetItemSpan[ITEM_SIC] = function (item, classes, htmlId)
{
    classes = classes + 'sic';
    t = item.altText;
    if (t === '') {
        t = item.theText;
    }
    return '<span class="' + classes +
            '" id="' + htmlId + '" title="Sic">' +
            t + '</span>';
};

itemDef.realGetItemSpan[ITEM_ABBREVIATION] = function (item, classes, htmlId)
{
    classes = classes + 'abbr';
    t = item.altText;
    if (t === '') {
        t = item.theText;
    }
    return '<span class="' + classes +
            '" id="' + htmlId + '" title="Abbreviation">' +
            t + '</span>';
};

itemDef.realGetItemSpan[ITEM_MARK] = function (item, classes, htmlId)
{
    classes = classes + 'mark';
    return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="Inline Note">' +
            '<span class="glyphicon ' +
            'glyphicon-exclamation-sign"></span></span>';
};

itemDef.realGetItemSpan[ITEM_NO_LINEBREAK] = function (item, classes, htmlId)
{
    classes = classes + 'nolb';
    return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="No linebreak">--</span>';
};

itemDef.realGetItemSpan[ITEM_UNCLEAR] = function (item, classes, htmlId)
{
    classes = classes + 'unclear';
    return '<span class="' + classes +
            '" id="' + htmlId + '" title="Unclear Text">' +
            item.theText + '</span>';
};

itemDef.realGetItemSpan[ITEM_ILLEGIBLE] = function (item, classes, htmlId)
{
    classes = classes + 'illegible';
    t = "🈑".repeat(item.length);
    return '<span class="' + classes +
            '" id="' + htmlId +
            '" title="Illegible Text">' + t + '</span>';
};

itemDef.realGetItemSpan[ITEM_GLIPH] = function (item, classes, htmlId)
{
    classes = classes + 'gliph';
    return '<span class="' + classes +
            '" id="' + htmlId + '" title="Gliph">' +
            item.theText + '</span>';
};

itemDef.realGetItemSpan[ITEM_ADDITION] = function (item, classes, htmlId)
{
    classes = classes + 'addition';
    if (item.extraInfo === 'above') {
        classes += ' addition-above';
    }
    return '<span class="' + classes +
            '" id="' + htmlId + '" title="Addition">' +
            item.theText + '</span>';
};

itemDef.realGetItemSpan[ITEM_DELETION] = function (item, classes, htmlId)
{
    classes = classes + 'deletion';
    return '<span class="' + classes +
            '" id="' +
            htmlId +
            '" title="Deletion">' +
            item.theText + '</span>';
};

itemDef.realGetItemSpan[ITEM_UNSUPPORTED] = function (item, classes, htmlId)
{
    console.log("Unsupported item type " + item.type +
            ", wrapping it on a default class");
    classes = classes + ' unknownitemtype';
    return '<span class="' +
            classes + '" id="' + htmlId +
            '" title="Unsupported">' + item.theText + '</span>';
};

/*
 * Item tooltips
 */

itemDef.realGetItemPopover = [];

itemDef.realGetItemPopover[ITEM_TEXT] = function (item) 
{
    return createSimpleTextualPopover('text', 'Text',  item.theText);
};

itemDef.realGetItemPopover[ITEM_RUBRIC] = function (item) 
{
    return createSimpleTextualPopover('rubric', 'Rubric', item.theText);
};

itemDef.realGetItemPopover[ITEM_GLIPH] = function (item) 
{
    return createSimpleTextualPopover('gliph', 'Gliph', item.theText);
};

itemDef.realGetItemPopover[ITEM_NO_LINEBREAK] = function (item) 
{
    return createSimpleTextualPopover('nolb', '', '');
};

itemDef.realGetItemPopover[ITEM_MARK] = function (item) 
{
    return createSimpleTextualPopover('ednote', '', '');
};

itemDef.realGetItemPopover[ITEM_SIC] = function (item) 
{
    return createPopoverWithAltText('sic', 
        'Original', item.theText, 
        'Correction', item.altText);
};

itemDef.realGetItemPopover[ITEM_ABBREVIATION] = function (item) 
{
    return createPopoverWithAltText('abbr', 
        'Original', item.theText, 
        'Expansion', item.altText);
};

itemDef.realGetItemPopover[ITEM_UNCLEAR] = function (item) 
{
    return createPopoverWithExtraInfo('unclear', 
        'Text', '???', 
        'Alternative', item.altText, 
        'Reason', item.extraInfo);
};


itemDef.realGetItemPopover[ITEM_ILLEGIBLE] = function (item) 
{
    var popover = createPopoverWithExtraInfo('illegible', 
        'Text', '<illegible>', 
        'Alternative', '', 
        'Reason', item.extraInfo);
        
    popover['text'] += '<br/><b>Length:</b> ' + item.length + ' characters';
    return popover;
};

itemDef.realGetItemPopover[ITEM_ADDITION] = function (item) 
{
    return createPopoverWithExtraInfo('add', 
        'Added Text', item.theText,
        '', '', 
        'Place', item.extraInfo);
};

itemDef.realGetItemPopover[ITEM_DELETION] = function (item) 
{
    return createPopoverWithExtraInfo('add', 
        'Deleted Text', item.theText,
        '', '', 
        'Technique', item.extraInfo);
};

itemDef.realGetItemPopover[ITEM_UNSUPPORTED] = function (item) 
{
    return {};
};

function createSimpleTextualPopover(type, label, text)
{
    var popover = {};
    popover['type'] = type;
    if (text === '') {
        popover['text'] = '';
    }
    else {
        popover['text'] = '<b>' + label + ':</b> ' + text;
    }
    return popover;
}

function createPopoverWithAltText(type, label, text, altLabel, altText) 
{
    popover = createSimpleTextualPopover(type, label, text);
    if (altText !== '')  {
        popover['text'] += '<br/><b>' + altLabel + ':</b> ' + altText;
    }
    return popover;
}

function createPopoverWithExtraInfo(type, label, text, altLabel, altText, extraLabel, extraInfo)
{
    popover = createPopoverWithAltText(type, label, text, altLabel, altText);
    if (extraInfo !== '')  {
        popover['text'] += '<br/><b>' + extraLabel + ':</b> ' + extraInfo;
    }
    return popover;
}