<?php

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

namespace AverroesProject;
/**
 * Generates SQL code to load a transcription into the database
 * 
 */
require_once 'public/config.php';
require_once 'public/classes/AverroesProjectData.php';

use \XMLReader;

/* -----------------------------------------------------------------*/
/*
 * ATTENTION: modify these parameters!!!
 * 
 * -----------------------------------------------------------------*/

$db = new AverroesProjectData($config['db'], $config['tables']);

$nextElementId= $db->getNextElementId();
$nextItemId = $db->getNextItemId();
$nextEdNoteId = $db->getNextEditorialNoteId();

$defaultLang = 'he';
$defaultHand = 0;

/* -----------------------------------------------------------------*/
if (isset($argv[1])){
    $filename = $argv[1];
}
else {
    die("Please give a filename to load.\n");
}

$elements = array();
$items = array();
$ednotes = array();


$reader = new XMLReader();
$reader->open($filename);

SqlComment("Generated from $filename");

/* 1. Get information editor info from the TEI header */
fastForwardToElement($reader, 'TEI', "Looking for TEI element");

fastForwardToElement($reader, 'teiHeader', "Looking for teiHeader inside TEI element");
$theHeader = simplexml_load_string($reader->readOuterXml());
$editorUsername = (string) $theHeader->fileDesc->titleStmt->editor->attributes('xml', TRUE)['id'];
if ($editorUsername === '' or $editorUsername === NULL){
    die("ERROR: No editor username given in TEI -> fileDesc -> titleStmt : \n");
}
$editorId = $db->getUserIdByUsername($editorUsername);

if ($editorId === false){
    die("Error: editor $editorUsername not a user in the system\n");
}
SqlComment("Editor: $editorUsername, id=$editorId");
$reader->next();


/* 2. Get the default language from the text element */
fastForwardToElement($reader, 'text', "Looking for text element");
if ($reader->getAttribute('xml:lang') === NULL){
    die("ERROR: need xml:lang in the text element\n");
}
else{
    $defaultLang = $reader->getAttribute('xml:lang');
}
SqlComment("Text language: $defaultLang");


/* 3. Move to the first div  element and start main processing loop */
fastForwardToElement($reader, 'body', "Looking for body element");
$processingDivs = TRUE;
while ($processingDivs){
    readSkippingWSandC($reader);
    if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='div' and
        $reader->getAttribute('type') === 'page' and $reader->getAttribute('facs')!== NULL){
        $facs = $reader->getAttribute('facs');
        $fields = explode("-", $facs);
        $page_number = (int) array_pop($fields);
        if ($page_number === 0 or $page_number === NULL){
            die("Can't read a page number from facs attribute: $facs\n");
        }
        $docDareId = implode('-', $fields);
        $doc_id =  $db->getDocIdFromDareId($docDareId);
        if ($doc_id === false){
            die ("ERROR: Document $docDareId not in the system\n");
        }
        $doc_id = (int) $doc_id;
        $lang = $defaultLang;
        $hand = $defaultHand;
        if ($reader->getAttribute('xml:lang') !== NULL){
            $lang = $reader->getAttribute('xml:lang');
        } 
        processPageDiv($reader, $doc_id, $page_number, $lang, $hand, $editorId);
    }
    else {
        $processingDivs = FALSE;
    }
    
}

/* 4. Print SQL */

print "INSERT INTO `ap_elements` (`id`, `type`, `doc_id`, `page_number`, `column_number`, `seq`,`lang`, `editor_id`, `hand_id`, `reference`,`placement`) VALUES\n";
end($elements);
$lastKey = key($elements);
foreach($elements as $key => $e){
    print "(";
    print $e['id'] . ", ";
    print $e['type'] . ", ";
    print $e['doc_id'] . ", ";
    print $e['page_number'] . ", ";
    print $e['column_number'] . ", ";
    print $e['seq'] . ", ";
    print stringOrNull($e['lang']) . ", ";
    print $e['editor_id'] . ", ";
    print $e['hand_id'] . ", ";
    print $e['reference'] . ", ";
    print stringOrNull($e['placement']);
    print ")"; 
    if ($key === $lastKey){
        print ";\n\n";
    }
    else {
        print ",\n";
    }
}

print "INSERT INTO `ap_items` (`id`, `type`, `ce_id`, `seq`,`lang`, `hand_id`, `text`,`alt_text`, `extra_info`, `length`, `target`) VALUES\n";
end($items);
$lastKey = key($items);
foreach($items as $key => $i){
    print "(";
    print $i['id'] . ", ";
    print $i['type'] . ", ";
    print $i['ce_id'] . ", ";
    print $i['seq'] . ", ";
    print stringOrNull($i['lang']) . ", ";
    print $i['hand_id'] . ", ";
    print stringOrNull($i['text']) . ", ";
    print stringOrNull($i['alt_text']) . ", ";
    print stringOrNull($i['extra_info']) . ", ";
    print $i['length'] . ", ";
    print $i['target'];
    print ")"; 
    if ($key === $lastKey){
        print ";\n\n";
    }
    else {
        print ",\n";
    }
}


if (count($ednotes)=== 0){
    SqlComment("No editorial notes found");
}
else{
    SqlComment("EDITORIAL NOTES");
    print "INSERT INTO `ap_ednotes` (`id`, `type`, `target`, `lang`, `author_id`, `text`) VALUES\n";
    end($ednotes);
    $lastKey = key($ednotes);
    foreach($ednotes as $key => $e){
        print "(";
        print $e['id'] . ", ";
        print $e['type'] . ", ";
        print $e['target'] . ", ";
        print stringOrNull($e['lang']) . ", ";
        print $e['author_id'] . ", ";
        print stringOrNull($e['text']);
        print ")"; 
        if ($key === $lastKey){
            print ";\n\n";
        }
        else {
            print ",\n";
        }
    }
}

/* =================================================================== */

function stringOrNull($str){
    if ($str === NULL){
        return 'NULL';
    }
    else {
        return "'" . $str . "'";
    }
}
/**
 * 
 * @param XmlReader $reader
 * reads skipping whitespace and comments
 */
function readSkippingWSandC($reader){
    $reader->read();
    while ($reader->nodeType === XMLReader::SIGNIFICANT_WHITESPACE or 
            $reader->nodeType === XMLReader::COMMENT){
        $reader->read();
    }
}

function processPageDiv($reader, $doc_id, $page_number, $lang, $hand, $editorId){
    global $nextElementId;
    global $elements;
    global $ednotes;
    global $nextEdNoteId;
    $column_number = 1;  
    
    $nextElementSeq = 1;
    $nextLineNumber = 1;
    
    SqlComment("Starting Page Div processing: docId=$doc_id, page=$page_number, lang=$lang, handId=$hand, editorId=$editorId");
    $processingCEs = TRUE;
    $haveColumns = false;
    while($processingCEs){
        readSkippingWSandC($reader);
        switch($reader->nodeType){
            case XMLReader::END_ELEMENT:
                if ($haveColumns){
                    $column_number++;
                    $haveColumns = false;
                } else {
                    $processingCEs = FALSE;
                }
                break;
            
            case XMLReader::ELEMENT:
                $elementLang = $lang;
                if ($reader->getAttribute('xml:lang') !== NULL){
                        $elementLang = $reader->getAttribute('xml:lang');
                } 
                switch($reader->name){
                case 'div':
                    $type = $reader->getAttribute('type');
                    if ($type === NULL || $type !== 'column'){
                        die ("Unrecognized <div> type under a page div: " . $type . "\n" );
                    };
                    $n = $reader->getAttribute('n');
                    if ($n === NULL){ 
                        die ("Need an 'n' attribute in column <div> element");
                    }
                    $n = (int) $n;
                    if ($n !== $column_number){
                        die ("Expected column number to be $column_number, got $n in column <div> element ");
                    }
                    $haveColumns = true;
                    SqlComment("Processing column number $column_number");
                    break;
                    
                case 'l':
                    $elementType = ColumnElement::LINE;
                    SqlComment("Found line, setting id=$nextElementId, col=$column_number, seq=$nextElementSeq, lineno=$nextLineNumber");
                    $e = array();
                    $e['id']=$nextElementId;
                    $e['type']= $elementType;
                    $e['doc_id']= $doc_id;
                    $e['page_number']= $page_number;
                    $e['column_number']=$column_number;
                    $e['seq']=$nextElementSeq;
                    $e['lang']=$elementLang;
                    $e['editor_id']=$editorId;
                    $e['hand_id']=$hand;
                    $e['reference']=$nextLineNumber;
                    $e['placement']=NULL;
                    array_push($elements, $e);
                    processTextItems($reader, $nextElementId, $elementLang, $hand, $editorId,  $reader->name, $page_number);
                    $nextElementId++;
                    $nextElementSeq++;
                    $nextLineNumber++;
                    break;
                    
                case 'gap':
                    $n = $reader->getAttribute('quantity');
                    $type = $reader->getAttribute('unit');
                    $r = $reader->getAttribute('reason');
                    if ($type !== 'line' && $type !== 'column'){
                        die("Unrecognized unit attribute for a gap element: " . $type . "\n");
                    }
                    if ($r !== 'pending-transcription'){
                        die("Unrecognized reason for a gap in a page, got: " . $r . "\n");
                    }
                    if ($n === NULL or $n <= 0){
                        die("Wrong number of lines pending transcription, got: " . $n . "\n");
                    }
                    switch ($type){
                        case 'line':
                            $nextElementSeq += $n; 
                            $nextLineNumber += $n;
                            break;
                        
                        case 'column':
                            $column_number++;
                            break;
                    }
                    SqlComment("Found <gap> of type $type, next element will have col=$column_number, seq=$nextElementSeq, lineno=$nextLineNumber");
                    break;
                
                case 'head':
                    $elementType = ColumnElement::HEAD;
                    SqlComment("Found head, setting id= $nextElementId, seq=$nextElementSeq");
                    $e = array();
                    $e['id']=$nextElementId;
                    $e['type']= $elementType;
                    $e['doc_id']= $doc_id;
                    $e['page_number']= $page_number;
                    $e['column_number']=$column_number;
                    $e['seq']=$nextElementSeq;
                    $e['lang']=$elementLang;
                    $e['editor_id']=$editorId;
                    $e['hand_id']=$hand;
                    $e['reference']='NULL';
                    $e['placement']=NULL;
                    array_push($elements, $e);
                    processTextItems($reader, $nextElementId, $elementLang, $hand, $editorId, $reader->name, $page_number);
                    $nextElementId++;
                    $nextElementSeq++;
                    break;
                    
                case 'fw':
                    if ($reader->getAttribute('type') !== 'catch'){
                        die("Unrecognized fw element");
                    }
                    $elementType = ColumnElement::CUSTODES;
                    SqlComment("Found custodes, setting id= $nextElementId, seq=$nextElementSeq");
                    $e = array();
                    $e['id']=$nextElementId;
                    $e['type']= $elementType;
                    $e['doc_id']= $doc_id;
                    $e['page_number']= $page_number;
                    $e['column_number']=$column_number;
                    $e['seq']=$nextElementSeq;
                    $e['lang']=$elementLang;
                    $e['editor_id']=$editorId;
                    $e['hand_id']=$hand;
                    $e['reference']='NULL';
                    $e['placement']=NULL;
                    array_push($elements, $e);
                    processTextItems($reader, $nextElementId, $elementLang, $hand, $editorId, $reader->name, $page_number);
                    $nextElementId++;
                    $nextElementSeq++;
                    break;

                case 'note':
                    switch($reader->getAttribute('type')){
                    case 'editorial':
                        $elementType = ColumnElement::NOTE_MARK;
                        $e = array();
                        $e['id']=$nextElementId;
                        $e['type']= $elementType;
                        $e['doc_id']= $doc_id;
                        $e['page_number']= $page_number;
                        $e['column_number']=$column_number;
                        $e['seq']=$nextElementSeq;
                        $e['lang']=$elementLang;
                        $e['editor_id']=$editorId;
                        $e['hand_id']=$hand;
                        $e['reference']='NULL';
                        $e['placement']=NULL;
                        array_push($elements, $e);
                                    
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::TEXT){
                            die("Expected text inside a note, got " . $reader->nodeType . "\n"); 
                        }
                
                        $en = array();
                        $en['id']= $nextEdNoteId;
                        $en['type']=  EditorialNote::OFFLINE;
                        $en['target'] = $nextElementId;
                        $en['lang']=$elementLang;
                        $en['author_id'] = $editorId;
                        $en['text'] = fixText($reader->readString());
                        array_push($ednotes, $en);
                
                        $nextElementId++;
                        $nextEdNoteId++;
                        $nextElementSeq++;
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of note element, got " . $reader->nodeType . "\n"); 
                        }
                        break;
                        
                    case 'gloss':
                        $elementType = ColumnElement::GLOSS;
                        $e = array();
                        $e['id']=$nextElementId;
                        $e['type']= $elementType;
                        $e['doc_id']= $doc_id;
                        $e['page_number']= $page_number;
                        $e['column_number']=$column_number;
                        $e['seq']=$nextElementSeq;
                        $e['lang']=$elementLang;
                        $e['editor_id']=$editorId;
                        $e['hand_id']='NULL';
                        $e['reference']='NULL';
                        $e['placement']=$reader->getAttribute('placement');
                        array_push($elements, $e);
                        processTextItems($reader, $nextElementId, $elementLang, $hand, $editorId, 'note', $page_number);
                        $nextElementId++;
                        $nextElementSeq++;
                        break;
                    
                    default:
                        die("Unrecognized note type, got " . $reader->getAttribute('type') . "\n");
                    }
                    break;
                
                default:
                    die("Uncognized element under page div: " . $reader->name. " at page $page_number\n");
                }
                
                
                break;
            
            default: 
                die("Unrecognized node type processing divs: " . $reader->nodeType . "\n");
        }
        
    }
    if ($reader->name != 'div'){
        die("Expected end of div, got " . $reader->name . "\n");
    }
}

function processTextItems($reader, $c_id, $lang, $hand, $editor, $elementName, $pageNumber){
    global $nextItemId;
    global $nextEdNoteId;
    global $ednotes;
    global $items;
    
    //SqlComment("Starting item processing: $c_id, $lang, $hand, $elementName");
    $processingItems = TRUE;
    $nextSeq = 1;
    while($processingItems){
        readSkippingWSandC($reader);
        switch($reader->nodeType){
        case XMLReader::END_ELEMENT:
            if ($reader->name !== $elementName){
                die("Expected end of $elementName, got " . $reader->name . "\n");
            }
            $processingItems = FALSE;
            break;
            
        case XMLReader::TEXT:
            $theText = $reader->readString();
            //SqlComment("Got text: $nextItemId, c_id=$c_id, seq=$nextSeq, lang=$lang, text='" . fixText($reader->readString()) . "'");
            $item = array();
            $item['id'] = $nextItemId;
            $item['type'] = TranscriptionTextItem::TEXT;
            $item['ce_id'] = $c_id;
            $item['seq'] = $nextSeq;
            $item['lang']=$lang;
            $item['hand_id']=$hand;
            $item['text']=fixText($reader->readString());
            $item['alt_text']=NULL;
            $item['extra_info']=NULL;
            $item['length']='NULL';
            $item['target']='NULL';
            array_push($items, $item);
            $nextItemId++;
            $nextSeq++;
            break;
        
        
        case XMLReader::ELEMENT: 
            switch($reader->name){
            case 'note':
                $item = array();
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::MARK;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=NULL;
                $item['hand_id']=$hand;
                $item['text']=NULL;
                $item['alt_text']=NULL;
                $item['extra_info']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                array_push($items, $item);
                processInlineNote($reader, $nextItemId, $editor, $lang);
                $nextItemId++;
                $nextSeq++;
                
                
                break;
                
            case 'hi':
                $itemLang = $lang;
                if ($reader->getAttribute('xml:lang') !== NULL){
                    $itemLang = $reader->getAttribute('xml:lang');
                }
                if ($reader->getAttribute('type') !== 'rubric'){
                    die("Unrecognized hi type: " . $reader->getAttribute('type'). "\n");
                }
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::TEXT){
                    die("Expected text inside a note, got " . $reader->nodeType . "\n"); 
                }
                $item = array();
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::RUBRIC;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$itemLang;
                $item['hand_id']=$hand;
                $item['text']=fixText($reader->readString());
                $item['alt_text']=NULL;
                $item['extra_info']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                array_push($items, $item);
                $nextItemId++;
                $nextSeq++;
                
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of note element, got " . $reader->nodeType . "\n"); 
                }
                break;
                
            case 'sic':
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::TEXT){
                    die("Expected text inside <sic>, got " . $reader->nodeType . "\n"); 
                }
                $item = array();
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::SIC;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$lang;
                $item['hand_id']=$hand;
                $item['text']=fixText($reader->readString());
                $item['alt_text'] = NULL;
                $item['extra_info']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                array_push($items, $item);
                $nextItemId++;
                $nextSeq++;
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of <sic> element, got " . $reader->nodeType . "\n"); 
                }
                break;
            
            case 'unclear':
                readSkippingWSandC($reader);
                switch($reader->nodeType){
                    case XMLReader::TEXT:
                        //SqlComment("got simple <unclear>");
                        $item = array();
                        $item['id'] = $nextItemId;
                        $item['type'] = TranscriptionTextItem::UNCLEAR;
                        $item['ce_id'] = $c_id;
                        $item['seq'] = $nextSeq;
                        $item['lang']=$lang;
                        $item['hand_id']=$hand;
                        $item['text']=fixText($reader->readString());
                        $item['alt_text'] = NULL;
                        $item['extra_info']='unclear';
                        $item['length']='NULL';
                        $item['target']='NULL';
                        array_push($items, $item);
                        $nextItemId++;
                        $nextSeq++;
                        readSkippingWSandC($reader);
                        if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                            processInlineNote($reader, $nextItemId, $editor, $lang);
                            readSkippingWSandC($reader);
                        }
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of <unclear> element, got type " . $reader->nodeType . "with name " . $reader->name . "\n"); 
                        }
                        break;
                    
                    case XMLReader::ELEMENT:
                        switch($reader->name){
                        case 'gap':
                            $item = array();
                            $item['id'] = $nextItemId;
                            $item['type'] = TranscriptionTextItem::ILLEGIBLE;
                            $item['ce_id'] = $c_id;
                            $item['seq'] = $nextSeq;
                            $item['lang']=NULL;
                            $item['hand_id']=0;
                            $item['text']=NULL;
                            $item['alt_text'] = NULL;
                            $item['extra_info']=$reader->getAttribute('reason');
                            $item['length']=$reader->getAttribute('quantity');
                            $item['target']='NULL';
                            array_push($items, $item);
                            readSkippingWSandC($reader);
                            if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                                processInlineNote($reader, $nextItemId, $editor, $lang);
                                readSkippingWSandC($reader);
                            }
                            if ($reader->nodeType !== XMLReader::END_ELEMENT){
                                die("Expected end of <gap> element, got " . $reader->nodeType . "\n"); 
                            }
                            $nextItemId++;
                            $nextSeq++;
                            break;
                        
                        case 'choice':
                            //SqlComment("Got a complex unclear");
                            if ($reader->name !== 'choice'){
                                die("Expected <choice> after <unclear>, got " . $reader->name. "\n");
                            }
                            readSkippingWSandC($reader);
                            if ($reader->nodeType !== XMLReader::ELEMENT or $reader->name !== 'unclear'){
                                die("Expected <unclear> after <unclear><choice>, got " . $reader->name. "\n");
                            }
                            readSkippingWSandC($reader);
                            if ($reader->nodeType !== XMLReader::TEXT){
                                die("Expected text after <unclear><choice><unclear>, got ". $reader->nodeType . "\n");
                            }
                            $item = array();
                            $item['id'] = $nextItemId;
                            $item['type'] = TranscriptionTextItem::UNCLEAR;
                            $item['ce_id'] = $c_id;
                            $item['seq'] = $nextSeq;
                            $item['lang']=$lang;
                            $item['hand_id']=$hand;
                            $item['text']=fixText($reader->readString());
                            $item['extra_info']='unclear';
                            $item['length']='NULL';
                            $item['target']='NULL';
                            //SqlComment("First alternative = " . $item['text']);
                            readSkippingWSandC($reader);
                            if ($reader->nodeType !== XMLReader::END_ELEMENT){
                                die("Expected end of <unclear> element, got type " . $reader->nodeType . "\n"); 
                            }
                             readSkippingWSandC($reader);
                            if ($reader->nodeType !== XMLReader::ELEMENT or $reader->name !== 'unclear'){
                                die("Expected second <unclear> after <unclear><choice><unclear>text</unclear>, got " . $reader->name. "\n");
                            }
                            readSkippingWSandC($reader);
                            if ($reader->nodeType !== XMLReader::TEXT){
                                die("Expected text after second <unclear>, got ". $reader->nodeType . "\n");
                            }
                            $item['alt_text']= fixText($reader->readString());
                            //SqlComment("Second alternative = ". $item['alt_text']);
                            array_push($items, $item);

                            readSkippingWSandC($reader);
                            if ($reader->nodeType !== XMLReader::END_ELEMENT){
                                die("Expected end of <unclear> element, got type " . $reader->nodeType . "\n"); 
                            }
                            readSkippingWSandC($reader);
                            if ($reader->nodeType !== XMLReader::END_ELEMENT){
                                die("Expected end of <choice> element, got " . $reader->nodeType . "\n"); 
                            }
                            readSkippingWSandC($reader);
                            if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                                processInlineNote($reader, $nextItemId, $editor, $lang);
                                readSkippingWSandC($reader);
                            }
                            if ($reader->nodeType !== XMLReader::END_ELEMENT){
                                die("Expected end of <unclear> element, got type " . $reader->nodeType . "\n"); 
                            }
                            $nextItemId++;
                            $nextSeq++;
                            break;
                        
                        default:
                            die("Unrecognized element inside <unclear>, got " . $reader->nodeType . "\n");
                        }
                        break;
                        
                        
                    default: 
                        die ("Unrecognized node type after <unclear>, got " . $reader->nodeType . "\n");
                        
                }
                break;
                
            case 'choice':
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::ELEMENT){
                    die("Expected another element after <choice>, got " . $reader->nodeType . "\n"); 
                }
                switch($reader->name){
                    case 'sic':
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::TEXT){
                            die("Expected text inside <sic>, got " . $reader->nodeType . "\n"); 
                        }
                        $item = array();
                        $item['id'] = $nextItemId;
                        $item['type'] = TranscriptionTextItem::SIC;
                        $item['ce_id'] = $c_id;
                        $item['seq'] = $nextSeq;
                        $item['lang']=$lang;
                        $item['hand_id']=$hand;
                        $item['text']=fixText($reader->readString());
                        $item['extra_info']=NULL;
                        $item['length']='NULL';
                        $item['target']='NULL';
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of <sic> element, got " . $reader->nodeType . "\n"); 
                        }
                        readSkippingWSandC($reader);
                        // NOTE: in the guidelines it says this should be 'corr', not 'supplied'
                        if ($reader->nodeType !== XMLReader::ELEMENT or $reader->name !== 'supplied'){
                            die("Expected another <supplied> after <sic>, got " . $reader->nodeType . "\n"); 
                        }
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::TEXT){
                            die("Expected text inside <supplied>, got " . $reader->nodeType . "\n"); 
                        }
                        
                        $item['alt_text']=fixText($reader->readString());

                        array_push($items, $item);
                        
                
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of <supplied> element, got " . $reader->nodeType . "\n"); 
                        }
                        readSkippingWSandC($reader);
                        if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                            processInlineNote($reader, $nextItemId, $editor, $lang);
                            readSkippingWSandC($reader);
                        }
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of <choice> element, got " . $reader->nodeType . "\n"); 
                        }
                        $nextItemId++;
                        $nextSeq++;
                        break;
                        
                    case 'abbr':
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::TEXT){
                            die("Expected text inside <abbr>, got " . $reader->nodeType . "\n"); 
                        }
                        $item = array();
                        $item['id'] = $nextItemId;
                        $item['type'] = TranscriptionTextItem::ABBREVIATION;
                        $item['ce_id'] = $c_id;
                        $item['seq'] = $nextSeq;
                        $item['lang']=$lang;
                        $item['hand_id']=$hand;
                        $item['text']=fixText($reader->readString());
                        $item['extra_info']=NULL;
                        $item['length']='NULL';
                        $item['target']='NULL';
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of <abbr> element, got " . $reader->nodeType . "\n"); 
                        }
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::ELEMENT or $reader->name !== 'expan'){
                            die("Expected <expan> after <abbr>, got " . $reader->nodeType . "\n"); 
                        }
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::TEXT){
                            die("Expected text inside <expan>, got " . $reader->nodeType . "\n"); 
                        }
                        
                        $item['alt_text']=fixText($reader->readString());

                        array_push($items, $item);
                        readSkippingWSandC($reader);
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of <expan> element, got " . $reader->nodeType . "\n"); 
                        }
                        readSkippingWSandC($reader);
                        if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                            processInlineNote($reader, $nextItemId, $editor, $lang);
                            readSkippingWSandC($reader);
                        }
                        if ($reader->nodeType !== XMLReader::END_ELEMENT){
                            die("Expected end of <choice> element, got " . $reader->nodeType . "\n"); 
                        }
                        $nextItemId++;
                        $nextSeq++;
                        break;
                    
                    default:
                        die("Unrecognized element inside <choice> : " . $reader->name . "\n");
                }
                break;
                
            case 'del':
                $item = array();
                $item['extra_info'] = $reader->getAttribute('rend');
                if (!TranscriptionText::isDeletionTechniqueAllowed($item['extra_info'])){
                    die("Deletion technique not allowed: " . $item['extra_info'] . "\n");
                }
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::TEXT){
                    die("Expected text inside <del>, got " . $reader->nodeType . "\n"); 
                }
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::DELETION;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$lang;
                $item['hand_id']=$hand;
                $item['text']=fixText($reader->readString());
                $item['alt_text']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                
                readSkippingWSandC($reader);
                if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                    processInlineNote($reader, $nextItemId, $editor, $lang);
                    readSkippingWSandC($reader);
                }
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of <del> element, got " . $reader->nodeType . "\n"); 
                }
                array_push($items, $item);
                $nextItemId++;
                $nextSeq++;
                break;
                
            case 'g':
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::TEXT){
                    die("Expected text inside <g>, got " . $reader->nodeType . "\n"); 
                }
                $item = array();
                $item['extra_info'] = NULL;
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::GLIPH;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$lang;
                $item['hand_id']=$hand;
                $item['text']=fixText($reader->readString());
                $item['alt_text']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                
                readSkippingWSandC($reader);
                if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                    processInlineNote($reader, $nextItemId, $editor, $lang);
                    readSkippingWSandC($reader);
                }
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of <g> element, got " . $reader->nodeType . "\n"); 
                }
                array_push($items, $item);
                $nextItemId++;
                $nextSeq++;
                break;
                
            case 'add':
                $item = array();
                $item['extra_info'] = $reader->getAttribute('place');
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::TEXT){
                    die("Expected text inside <add>, got " . $reader->nodeType . "\n"); 
                }
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::ADDITION;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$lang;
                $item['hand_id']=$hand;
                $item['text']=fixText($reader->readString());
                $item['alt_text']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                readSkippingWSandC($reader);
                if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                    processInlineNote($reader, $nextItemId, $editor, $lang);
                    readSkippingWSandC($reader);
                }
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of <add> element, got " . $reader->nodeType . "\n"); 
                }
                array_push($items, $item);
                $nextItemId++;
                $nextSeq++;
                break;
            
            case 'lb':
                $b = $reader->getAttribute('break');
                if ($b === NULL){
                    die("Need a 'break' attribute in an <lb>, got none\n");
                }
                if ($b !== 'no'){
                    die("Unrecognized 'break' attribute in <lb>: $b\n");
                }
                $item = array();
                $item['extra_info'] = NULL;
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::NO_LINEBREAK;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$lang;
                $item['hand_id']=$hand;
                $item['text']=NULL;
                $item['alt_text']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                array_push($items, $item);
                $nextItemId++;
                $nextSeq++;
                break;
                
            case 'mod':
                $type = $reader->getAttribute('type');
                if ($type === NULL){
                    die("Need a 'type' attribute inside <mod>\n");
                }
                if ( $type !== 'subst'){
                    die("Unsupported <mod> type: $type\n");
                }
                // This maybe needed later!
                $modXmlId = $reader->getAttribute('xml:id');
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::ELEMENT){
                    die("Expected an element after <mod>, got " . $reader->nodeType . "\n"); 
                }
                if ($reader->name !== 'del'){
                    die("Expected a <del> element after <mod>m, got " . $reader->name . "\n");
                }
                // Process DELETION
                $item = array();
                $item['extra_info'] = $reader->getAttribute('rend');
                if (!TranscriptionText::isDeletionTechniqueAllowed($item['extra_info'])){
                    die("Deletion technique not allowed: " . $item['extra_info'] . "\n");
                }
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::TEXT){
                    die("Expected text inside <del>, got " . $reader->nodeType . "\n"); 
                }
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::DELETION;
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$lang;
                $item['hand_id']=$hand;
                $item['text']=fixText($reader->readString());
                $item['alt_text']=NULL;
                $item['length']='NULL';
                $item['target']='NULL';
                readSkippingWSandC($reader);
                if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                    processInlineNote($reader, $nextItemId, $editor, $lang);
                    readSkippingWSandC($reader);
                }
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of <del> element, got " . $reader->nodeType . "\n"); 
                }
                array_push($items, $item);
                // save id for later
                $deletionItemId = $nextItemId;
                $nextItemId++;
                $nextSeq++;
                
                // On to the addition
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::ELEMENT){
                    die("Expected an element after </del>, got " . $reader->nodeType . "\n"); 
                }
                if ($reader->name !== 'add'){
                    die("Expected an <add> element after </del>m, got " . $reader->name . "\n");
                }
                $item = array();
                $place = $reader->getAttribute('place');
                if ($place === NULL or $place===''){
                    die("Expected a non-empty place attribute inside <add>\n");
                }
                $item['extra_info'] = $place;
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::TEXT){
                    die("Expected text inside <add>, got " . $reader->nodeType . "\n"); 
                }
                $item['id'] = $nextItemId;
                $item['type'] = TranscriptionTextItem::ADDITION;
                
                $item['ce_id'] = $c_id;
                $item['seq'] = $nextSeq;
                $item['lang']=$lang;
                $item['hand_id']=$hand;
                $item['text']=fixText($reader->readString());
                $item['alt_text']=NULL;
                $item['length']='NULL';
                $item['target']=$deletionItemId;
                readSkippingWSandC($reader);
                if ($reader->nodeType === XMLReader::ELEMENT and $reader->name==='note'){
                    processInlineNote($reader, $nextItemId, $editor, $lang);
                    readSkippingWSandC($reader);
                }
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of <add> element, got " . $reader->nodeType . "\n"); 
                }
                array_push($items, $item);
                $nextItemId++;
                $nextSeq++;
             
                readSkippingWSandC($reader);
                if ($reader->nodeType !== XMLReader::END_ELEMENT){
                    die("Expected end of <mod> element, got " . $reader->nodeType . "\n"); 
                }
                break;
                
            default: 
                die("Unrecognized element inside <$elementName>: <" . $reader->name . "> in page $pageNumber\n");
                
            }
        }
    }
    
}

function processInlineNote($reader, $itemId, $author, $lang){
    global $ednotes;
    global $nextEdNoteId;
    
    $noteLang = $lang;
    if ($reader->getAttribute('xml:lang') !== NULL){
        $noteLang = $reader->getAttribute('xml:lang');
    }
    if ($reader->getAttribute('type') !== 'editorial'){
        die("Unrecognized note type: " . $reader->getAttribute('type'). "\n");
    }
    readSkippingWSandC($reader);
    if ($reader->nodeType !== XMLReader::TEXT) {
        die("Expected text inside a note, got " . $reader->nodeType . "\n");
    }

    $en = array();
    $en['id'] = $nextEdNoteId;
    $en['type'] = EditorialNote::INLINE;
    $en['target'] = $itemId;
    $en['lang'] = $noteLang;
    $en['author_id'] = $author;
    $en['text'] = fixText($reader->readString());
    array_push($ednotes, $en);

    $nextEdNoteId++;
    readSkippingWSandC($reader);
    if ($reader->nodeType !== XMLReader::END_ELEMENT) {
        die("Expected end of <note> element, got " . $reader->nodeType . "\n");
    }
}
function SqlComment($msg){
    print "/* " . $msg . " */\n";
}

function debug($msg){
    SqlComment('DEBUG: ' . $msg);
}

function fixText($str){
    global $db;
    $ws = array("\n", "\t");
    return $db->real_escape_string(preg_replace('/\s+/', ' ', str_replace($ws, ' ', ltrim($str))));
}

function fastForwardToElement($reader, $element, $errorContext, $ignoreOthers=FALSE, $doNotDieOnEnd = FALSE){
    // This function is ugly!!!
    //print("DEBUG: --------- FF to $element in $errorContext -------------\n");
    if (!$reader->read()){
        if (!$doNotDieOnEnd){
            return FALSE;
        }
        die("ERROR: End of file. " . $errorContext);
    }
 
    while($reader->nodeType !== XMLReader::ELEMENT){
        //print ("DEBUG:  NodeType = " . $reader->nodeType . "\n");
        if (!$reader->read()){
            if (!$doNotDieOnEnd){
            return FALSE;
            }
            die("ERROR: End of file. " . $errorContext);
        }
    }
    
    while ($reader->name !== $element){
        //print ("DEBUG: Got element = " . $reader->name . "\n");
        if ($ignoreOthers){
            print "WARNING: Ignoring element " . $reader->name . ". " . $errorContext . "\n";
            $reader->next();
            // Skip whitespace nodes between same level elements
            while ($reader->nodeType === XMLReader::SIGNIFICANT_WHITESPACE){
                $reader->next();
            }
        }
        else {
            die("ERROR: Got '" . $reader->name . "' " . $errorContext);
        }
    }
    //print ("DEBUG: **** end successful FF ****\n");
    return TRUE;
}
