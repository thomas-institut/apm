/* 
 * Copyright (C) 2016 Universität zu Köln
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

var minDocumentFontSize = 8;
var maxDocumentFontSize = 64;
var currentDocumentFontSize = 12;

var pageNumber;
var docId;
var apiBase;
var numColumns;

function changeDocumentFontSize(bigger){
    
    newFS = currentDocumentFontSize;
    
    if (bigger && currentDocumentFontSize < maxDocumentFontSize){
        newFS++;
    } 
    else if (!bigger && currentDocumentFontSize > minDocumentFontSize){
        newFS--;
    }
    if (newFS !== currentDocumentFontSize){
        for (var i=1; i <=numColumns; i++){
            $('#col' + i).css('font-size', newFS);
        }
        
        currentDocumentFontSize = newFS;
    }
}

$(document).ready(function(){
    reportedFS = $('#right-component').css('font-size');
    currentDocumentFontSize = /\d+/.exec(reportedFS);
//    console.log('Document font size: ' + currentDocumentFontSize + ' pixels');
    $.getJSON(apiBase + '/api/' + docId + '/' + pageNumber +  '/numcolumns', function (resp){
        var col;
        numColumns = resp;
        if (numColumns === 0){
            $('#right-component').html('<div class="notranscription">No transcription available for this page</div>');
        } else {
            theUl = '<ul class = "nav nav-tabs">';
            for (col = 1; col <= numColumns; col++){
                theUl += '<li id="colheader' + col +'">';
                theUl += '<a data-toggle="tab" href="#col' + col + '">Column ' + col + '</a></li>';
            };
            theUl += '</ul>';
            theUl += '<div class="tab-content" id="textcolumns"></div>';
            $('#right-component').html(theUl);
            
            
            $('.nav-tabs a').click(function(){
                $(this).tab('show');
            });
             
            for (col = 1; col <= numColumns; col++){
                var theDiv;
                theDiv = '<div class="textcol tab-pane';
                if (col === 1){
                    theDiv += ' active';
                }
                theDiv += '" id="col' + col + '"></div>';
                $('#textcolumns').append(theDiv);
                $.getJSON(apiBase + '/api/' + docId + '/' + pageNumber + '/' + col + '/elements', function (resp){
                    var tc; 
                    var theCol = resp.info['col'];
                    //console.log('Column: ' + theCol);
                    tc = buildPageTextContainer(resp.elements, resp.ednotes, resp.people);
                    $('#col' + theCol).html(tc['text']);
                    setupTooltips(tc['tooltips']);
                    if (theCol == 1){
                        $('#colheader' + theCol).tab('show');
                    }
                });
                
            }
            
        }
    });
});
           
$(function() {
    $('div.split-pane').splitPane();
});


function buildPageTextContainer(elements, ednotes, people){

    function hasEdnotes(id, notes){
        var i;
        
        for (i=0; i < notes.length; i++){
            if (notes[i].target === id){
                return true;
            }
        }
        return false;
    }
    
    if (elements.length === 0){
        return { 'text' : '<p class="notranscription">No transcription available for this column</p>', 'tooltips' : []};
    }
    
    rtl = isRtl(elements);
    s = '<table class=\"textlines\">';


    richTooltips = {};
    for (i=0; i < elements.length; i++){
        switch(elements[i].type){
            // ColumnElement::LINE
            case 1:
                nLabel = elements[i].reference;
                tooltipText='';
                break;
            
            // ColumnElement::HEAD
            case 2:
                nLabel = 'H';
                tooltipText = 'Head';
                break;

            // ColumnElement::CUSTODES:
            case 5:
                nLabel = 'C';
                tooltipText = 'Custodes';
                break;
       
            // ColumnElement::GLOSS:
            case 3:
                nLabel = 'G';
                tooltipText = 'Gloss';
                break;
                
            default:
                nLabel = 'Unk';
                tooltipText = 'Unsupported Element';
        }

        s = s + '<tr>';
        seqtd = '<td class="linenumber" title="' + tooltipText + '">' + nLabel + '</td>';
        
        theText = '';
        for (j=0; j < elements[i].items.theItems.length; j++){
            
            item = elements[i].items.theItems[j];
            htmlId = 'item' + item.id;
            classes = '';
            itemHasEdnotes = hasEdnotes(item.id, ednotes);
            if (itemHasEdnotes){
                classes += 'hasednote';
            }
            switch(item.type){
                // TranscriptionTextItem::TEXT:
                case 1:
                    classes = classes + ' regulartext';
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '">' + item.theText + '</span>';
                    break;
  
                // TranscriptionTextItem::RUBRIC:
                case 2:
                    classes = classes + ' rubric';
                    theText = theText + '<span class="' + classes +  '" title="Rubric" id="' + htmlId + '">' + item.theText + '</span>';
                    break;

                // case TranscriptionTextItem::SIC:
                case 3:
                    classes = classes  + ' sic';
                    t = item.altText;
                    if (t === ''){
                        t = item.theText;
                    }
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '" title="Sic">' + t + '</span>';
                    richTooltips[htmlId] = {};
                    richTooltips[htmlId]['type'] = 'sic';
                    richTooltips[htmlId]['text'] =  '<b>Original:</b> ' + item.theText + '<br/><b>Correction:</b> ' + item.altText;
                    break;
                
                // TranscriptionTextItem::ABBREVIATION:
                case 11:
                    classes = classes + ' abbr';
                    t = item.altText;
                    if (t === ''){
                        t = item.theText;
                    }
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '" title="Abbreviation">' + t + '</span>';
                    richTooltips[htmlId] = {};
                    richTooltips[htmlId]['type'] = 'abbr';
                    richTooltips[htmlId]['text'] =  '<b>Original:</b> ' + item.theText + '<br/><b>Expansion:</b> ' + item.altText;
                    break;
                
                // TranscriptionTextItem::MARK:
                case 9:
                    classes = classes + ' mark';
                    theText = theText + '<span class="' + classes +  '" id="' +  htmlId + '" title="Note(s)"><span class="glyphicon glyphicon-exclamation-sign"></span></span>';
                    break;
                    
                // TranscriptionTextItem::NO_LINEBREAK:
                case 10:
                    classes = classes + ' nolb';
                    theText = theText + '<span class="' + classes +  '" id="' +  htmlId + '" title="No linebreak">--</span>';
                    break;

                //TranscriptionTextItem::UNCLEAR:
                case 4:
                    classes = classes + ' unclear';
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '" title="Unclear Text">' + item.theText + '</span>';
                    richTooltips[htmlId] = {};
                    richTooltips[htmlId]['type'] = 'unclear';
                    ttt = '';
                    if (item.altText !== '' && item.altText !== null){
                        ttt = ttt + '<b>Alternative:</b> ' + item.altText + '<br/>';
                    }
                    ttt = ttt + '<b>Reason:</b> ' + item.extraInfo;
                    richTooltips[htmlId]['text'] =  ttt;
                    break;

                // TranscriptionTextItem::ILLEGIBLE:
                case 5:
                    classes = classes + ' illegible';
                    t = "🈑".repeat(item.length);
                    theText = theText + '<span class="'+ classes +  '" id="' + htmlId + '" title="Illegible Text">' + t + '</span>';
                    richTooltips[htmlId] = {};
                    richTooltips[htmlId]['type'] = 'illegible';
                    ttt = '';
                    if (item.extraInfo !== 'illegible'){
                        ttt = ttt + '<b>Reason:</b> ' + item.extraInfo + '<br/>';
                    }
                    ttt = ttt + '<b>Length:</b> ' + item.length + ' characters';
                    richTooltips[htmlId]['text'] =  ttt;
                    break;
                    
                // TranscriptionTextItem::GLIPH:
                case 6: 
                    classes = classes + ' gliph';
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '" title="Gliph">' + item.theText + '</span>';
                    richTooltips[htmlId] = {};
                    richTooltips[htmlId]['type'] = 'gliph';
                    richTooltips[htmlId]['text'] =  '<b>Text:</b> ' + item.theText;
                    break;
                    
                // TranscriptionTextItem::ADDITION:
                case 7:
                    classes = classes + ' addition';
                    if (item.extraInfo == 'above'){
                        classes += ' addition-above';
                    }
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '" title="Addition">' + item.theText + '</span>';
                    richTooltips[htmlId] = {};
                    richTooltips[htmlId]['type'] = 'del';
                    richTooltips[htmlId]['text'] =  '<b>Added Text:</b> ' + item.theText + 
                            '</br><b>Place:</b> ' + item.extraInfo;
                    break;
                    
                // TranscriptionTextItem::DELETION:
                case 8:
                    classes = classes + ' deletion';
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '" title="Deletion">' + item.theText + '</span>';
                    richTooltips[htmlId] = {};
                    richTooltips[htmlId]['type'] = 'del';
                    richTooltips[htmlId]['text'] =  '<b>Deleted Text:</b> ' + item.theText + '</br><b>Technique:</b> ' + item.extraInfo;
                    break;
                    
               
                default:
                    console.log("Unsupported item type " + item.type + ", wrapping it on a default class");
                    classes = classes + ' unknownitemtype';
                    theText = theText + '<span class="' + classes +  '" id="' + htmlId + '" title="Unsupported">' + item.theText + '</span>';
                    if (item.altText != '' || item.extraInfo != ''){
                        richTooltips[htmlId] = {};
                        richTooltips[htmlId]['type'] = 'unk';
                        richTooltips[htmlId]['text'] =  '<b>Alt Text:</b> ' + item.altText + '<br/><b>Extra Info:</b> ' + item.extraInfo;
                    }
            }
            if (itemHasEdnotes){
                if (!richTooltips.hasOwnProperty(htmlId)){
                    richTooltips[htmlId]={};
                    richTooltips[htmlId]['type'] = 'ednote';
                    richTooltips[htmlId]['text'] = '';
                }
                t = '<span class="tooltip-notes">';
                for (k=0; k < ednotes.length; k++){
                    if (ednotes[k]['target'] === item.id){
                        t += '<blockquote><p>' + ednotes[k]['text'] + '</p>';
                        t += '<footer>' + people[ednotes[k]['authorId']]['fullname'] + ' @ ' + ednotes[k]['time'] + '</footer>';
                        t += '</blockquote>';
                    }
                }
                t += '</span>';
                richTooltips[htmlId]['text'] += t;
            } // hasEdnotes
        } // for all items  
        texttd = '<td class="text-' +  elements[i].items.lang + '">' + theText + "</td>";
        if (rtl){
            s = s + texttd + seqtd;
        }
        else {
            s =  s + seqtd + texttd;
        }
        s = s + '</tr>';
         
    }
      
    s += '</table>';
    return {'text': s, 'tooltips': richTooltips};
}


function setupTooltips(richTooltips){
    Object.keys(richTooltips).forEach( function(key, index) {
        if (richTooltips[key]['type'] === 'ednote'){
            $("#" + key).popover({title: 'Note(s)', content: richTooltips[key]['text'], container: 'body', html: true, placement: 'auto', trigger: 'hover'});
        } else {
            $("#" + key).popover({content: richTooltips[key]['text'], container: 'body', html: true, placement: 'auto', trigger: 'hover'});
        }
    });
}

function isRtl(elements){
    r = false;
    rtl = 0;
    ltr = 0;
    for (i=0; i<elements.length; i++){
        switch(elements[i].lang){
            case 'he':
            case 'ar':
                rtl++;
                break;
            
            default:
                ltr++;
        }
    }
    if (rtl > ltr){
        r = true;
    }
        
    return r;
}