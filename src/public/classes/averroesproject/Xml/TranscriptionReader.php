<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject\Xml;

use XmlMatcher\XmlToken;
use Matcher\Pattern;
use AverroesProject\TxText\Item;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;

/**
 * Class to read a transcription from XML input
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TranscriptionReader {
    
    const ERROR_NO_ERROR = 0;
    const ERROR_EOF = 1;
    const ERROR_NO_EDITOR = 2;
    const ERROR_INCORRECT_STRUCTURE = 3;
    const ERROR_WRONG_ELEMENT = 4;
    const ERROR_NOT_TEI = 5;
    const ERROR_XML_LANG_NOT_FOUND = 6;
    const ERROR_BAD_PAGE_DIV = 7;
    const ERROR_CANNOT_LOAD_XML = 8;
    const ERROR_ADD_WIHOUT_VALID_TARGET = 9;
    const ERROR_MISSING_COL_NUMBER = 10;
    const ERROR_XML_LANG_NOT_ALLOWED = 11;
        
    const MSG_GENERIC_ERROR = 'Error found';
    const MSG_GENERIC_WARNING = 'Warning';
    const MSG_INCORRECT_STRUCTURE = 'Incorrect structure';
    const MSG_BAD_TEI = 'Not a valid TEI file';
    const MSG_END_OF_FILE = 'End of file found';
    const MSG_LOOKING_FOR_TEI_HEADER = "Looking for <teiHeader> inside <TEI>";
    const MSG_IGNORED_ELEMENT = "Ignored element <%s>";
    const MSG_NO_EDITOR = "No editor username given";
    const MSG_EXPECTED_ELEMENT = "Expected <%s>, got <%s>";
    const MSG_XML_LANG_REQUIRED = "xml:lang attribute is required";
    const MSG_LOOKING_FOR_BODY_ELEMENT = "Looking for <body> inside <text>";
    const MSG_BAD_PAGE_DIV = 
            "Bad page <div>, expected <page type='page' facs='[pageId]'";
    const MSG_XML_LANG_NOT_ALLOWED = "Invalid language xml:lang '%s'";
    
    const WARNING_IGNORED_ELEMENT = 500;
    const WARNING_BAD_ITEM = 501;
    const WARNING_BAD_ATTRIBUTE  = 502;
    const WARNING_IGNORED_DIV = 503;
        
    public $transcription;
    
    
    public $errorNumber;
    public $errorMsg;
    public $errorContext;
    
    /**
     * Warnings
     * 
     * @var [][]
     */
    public $warnings;
    
    
    public function __construct()
    {
        $this->transcription = [];
        $this->reset();
        
    }
    
    public function reset(){
        $this->transcription['people'] = [];
        $this->transcription['defaultLang'] = '';
        $this->transcription['pageDivs'] = [];
        $this->transcription['countBodyDivsProcessed'] = 0;
        $this->errorNumber = self::ERROR_NO_ERROR;
        $this->errorMsg = '';
        $this->warnings = [];
    }
    
    private function isLangAllowed($lang, $allowedLangs) 
    {
        // Special case: empty $allowedLangs means ALL languages
        // are allowed
        if (count($allowedLangs) === 0) {
            return true;
        }
        foreach ($allowedLangs as $allowed) {
            if ($lang === $allowed) {
                return true;
            }
        }
        return false;
        
    }
    
    /**
     * The defaults array should contain at least a 'langs' element
     * with the languages allowed in xml:lang attributes
     * @param type $xml
     * @param type $defaults array of defaults
     * @return boolean
     */
    public function read($xml, $defaults = [ 'langs' => [] ])
    {
        libxml_use_internal_errors(true);
        $sXml = simplexml_load_string($xml);
        
        if ($sXml === false){
            $errorMsg = '';
            foreach(libxml_get_errors() as $error){
                $errorMsg .= $error->message . "; ";
            }
            $this->setError(self::ERROR_CANNOT_LOAD_XML, $errorMsg);
            return false;
        }
        
        if (!$this->checkTEIBasicStructure($sXml)){
            return false;
        }
        
        if (!$this->getInfoFromHeader($sXml->teiHeader)) {
            return false;
        }
        
        $defaultLang = $this->getLang($sXml->text);
        if ($defaultLang === '') {
            $this->setError(self::ERROR_XML_LANG_NOT_FOUND, 
                    self::MSG_XML_LANG_REQUIRED, " in <text> element");
            return false;
        }
        if (!$this->isLangAllowed($defaultLang, $defaults['langs'])) {
            $this->setError(self::ERROR_XML_LANG_NOT_ALLOWED, 
            sprintf(self::MSG_XML_LANG_NOT_ALLOWED, $defaultLang), " in <text> element");
            return false;
        }
        
        $this->transcription['defaultLang'] = $defaultLang;
        
        foreach ($sXml->text->body->div as $bodyDiv){
            if (!$this->processBodyDiv($bodyDiv)){
                return false;
            }
        }

        // Set language and handId in all columns, elements and items if not set
        foreach($this->transcription['pageDivs'] as &$page) {
            if ($page['defaultLang'] === '') {
                $page['defaultLang'] = $defaultLang;
            }
            foreach ($page['cols'] as &$col) {
                if ($col['defaultLang'] === '') {
                    $col['defaultLang'] = $page['defaultLang'];
                }
                foreach ($col['elements'] as &$element) {
                    if ($element->lang === Element::LANG_NOT_SET) {
                        $element->lang = $col['defaultLang'];
                    }
                    if ($element->handId === Element::ID_NOT_SET) {
                        $element->handId = 0;
                    }
                    ItemArray::setLang($element->items, $element->lang);
                    ItemArray::setHandId($element->items, 0);
                }
            }
        }
        
        // No need to check the end of the file; if there were unclosed tags
        // the XmlReader would have complained already!
       
        return true;
    }
    
    private function checkTEIBasicStructure($sXml){
        if ($sXml->getName() !== 'TEI'){
            $this->setError(self::ERROR_NOT_TEI, self::MSG_BAD_TEI, 
                    self::MSG_BAD_TEI);
            return false;
        }

        if (count($sXml->teiHeader) === 0) {
            $this->setError(self::ERROR_INCORRECT_STRUCTURE, 
                    self::MSG_INCORRECT_STRUCTURE,
                    self::MSG_LOOKING_FOR_TEI_HEADER);
            return false;
        }
        
        if (count($sXml->text->body) === 0){
            $this->setError(self::ERROR_INCORRECT_STRUCTURE, 
                    self::MSG_INCORRECT_STRUCTURE,
                    self::MSG_LOOKING_FOR_BODY_ELEMENT);
            return false;
        }
        return true;
    }
    
    /**
     * Process the XML inside <body>
     *
     * @param string $sXml
     * @return boolean
     */
    private function processBodyDiv($sXml)
    {
        $this->transcription['countBodyDivsProcessed']++;

        if (!$this->isPageDivElement($sXml)){
            // Not a page div, return true
            // = don't process but don't generate an error
            $this->addWarning(self::WARNING_IGNORED_DIV, "Ignored DIV under body, not a page div");
            return true;
        }

        $result = $this->processPageDiv($sXml);
        if ($result === false) {
            return false;
        }
        $this->transcription['pageDivs'][] = $result;
      
        return true;
    }
    
    /**
     * Returns true if the given XML is a page div
     * element
     * 
     * @param type $sXml
     * @return boolean
     */
    private function isPageDivElement($sXml)
    {
        $type = (string) $sXml['type'];
        $facs = (string) $sXml['facs'];
        if ($type !== 'page') {
            return false;
        }
        if ($facs === ''){
            return false;
        }
        return true;
    }
    
    /**
     * Returns the xml:lang attribute of the given XML
     * or '' if not set
     *
     * @param type $sXml
     * @return string
     */
    private function getLang($sXml)
    {
        return (string) $sXml->attributes('xml', TRUE)['lang'];
    }
    
    /**
     * Process a page div. 
     * 
     * Returns an associative array with the following 
     * information:
     * 
     *   $r['elements'] : column elements
     *   $r['items'] : column items
     *   $r['ednotes'] : editorial notes
     *   $r['people'] : editors and editorial note authors
     * 
     * 
     * @param type $sXml
     * @param type $pageDiv
     * @return boolean|array 
     */
    private function processPageDiv($sXml)
    {
        $pageDiv = [];
        $pageDiv['facs'] = (string) $sXml['facs'];
        $pageDiv['defaultLang'] = $this->getLang($sXml);
        $pageDiv['cols'] = [];
        $pageDiv['elements'] = [];
        $pageDiv['ednotes'] = [];
        $pageDiv['defaultEditor'] = 0;
        
        // Check for page divs
        $foundColumnDivs = false;
        foreach ($sXml->children() as $underDiv){
            if ($underDiv->getName() === 'div' && 
                    (string) $underDiv['type'] === 'column') {
                $foundColumnDivs = true;
                break;
            }
        }
        
        if ($foundColumnDivs) {
            $declaredMissingColumns = 0;
            foreach ($sXml->children() as $underDiv){
                switch($underDiv->getName()) {
                case 'div':
                    $colNumber = (int) $underDiv['n'];
                    if (!$colNumber){
                        $this->setError(self::ERROR_MISSING_COL_NUMBER, 
                                "Bad column number in div: n=$colNumber");
                        return false;
                    }
                    $pageDiv['cols'][$colNumber] = [];
                    $pageDiv['cols'][$colNumber]['defaultLang'] = 
                            $this->getLang($underDiv);
                    $pageDiv['cols'][$colNumber]['colNumber'] = $colNumber;

                    $readResult = $this->readColumn($underDiv, $pageDiv['cols'][$colNumber], $pageDiv);
                    if ($readResult === false){
                        return false;
                    }
                    $pageDiv['cols'][$colNumber] = $readResult;
                    break;
                    
                case 'gap':
                    $declaredMissingColumns += (int) $underDiv['n'];
                    break;
                }
                
            }
            $pageDiv['nGaps'] = $declaredMissingColumns;    
            return $pageDiv;
        }
        // Single column in page div
        $pageDiv['nGaps'] = 0;
        $pageDiv['cols'][1] = [];
        $pageDiv['cols'][1]['defaultLang'] = $pageDiv['defaultLang'];
        $pageDiv['cols'][1]['colNumber'] = 1;
        
        $readResult2 = $this->readColumn($sXml, $pageDiv['cols'][1], $pageDiv);
        if ($readResult2 === false){
            return false;
        }
        $pageDiv['cols'][1] = $readResult2;
        
        return $pageDiv;
    }
    
    /**
     * Reads a column of transcription. Returns
     * an updated page div or false if there's any error.
     * 
     * @param type $sXml
     * @param type $pageDiv
     * @return array
     */
    private function readColumn($sXml, $col, $pageDiv)
    {   
        $col['elements'] = [];
        $col['ednotes'] = [];
        $elementId = 0;
        $elementSeq = 0;
        $xmlElementCount = 0;
        $itemId = 0;
        $additions = [];
        
        foreach($sXml as $elementXml){
            $xmlElementCount++;
            $ignore = false;
            $gap = false;
            switch($elementXml->getName()) {
                case 'gap':
                    // Don't care about unit and reason attributes, it's
                    // always lines and pending transcription
                    $nLines = (int) $elementXml['quantity'];
                    $element = new \AverroesProject\ColumnElement\LineGap();
                    $element->editorId = $pageDiv['defaultEditor'];
                    $readItems = false;
                    if ($nLines !== 0) {
                        $element->setLineCount($nLines);
                    }
                    break;
                
                case 'add':
                    $element = new \AverroesProject\ColumnElement\Addition();
                    $readItems = true;
                    // Store the target Id, this will be checked later
                    // with metamark and del items
                    $element->targetXmlId = (string) $elementXml['target'];
                    $element->placement = (string) $elementXml['place'];
                    $element->editorId = $pageDiv['defaultEditor'];
                    $additions[] = ['elementId' => $elementId,
                        'target' => $element->targetXmlId];
                    break;
                    
                case 'l':
                    $element = new \AverroesProject\ColumnElement\Line();
                    $element->editorId = $pageDiv['defaultEditor'];
                    $readItems = true;
                    break;
                
                case 'head':
                    $element = new \AverroesProject\ColumnElement\Head();
                    $element->editorId = $pageDiv['defaultEditor'];
                    $readItems = true;
                    break;
                
                case 'fw':
                    $type = (string) $elementXml['type'];
                    switch($type) {
                    case 'catch':
                        $element = new \AverroesProject\ColumnElement\Custodes();
                        $element->editorId = $pageDiv['defaultEditor'];
                        $readItems = true;
                        break;
                    
                    case 'pageNum':
                        $element = new \AverroesProject\ColumnElement\PageNumber();
                        $element->editorId = $pageDiv['defaultEditor'];
                        $readItems = true;
                        break;
                    
                    default:
                        $ignore = true;
                        break;
                    }
                    break;
                    
                case 'note':
                    $type = (string) $elementXml['type'];
                    if ( $type === 'editorial') {
                        $readItems = false;
                        $element = new \AverroesProject\ColumnElement\NoteMark();
                        $element->editorId = $pageDiv['defaultEditor'];
                        $theNote = new \AverroesProject\EditorialNote();
                        $theNote->type = \AverroesProject\EditorialNote::OFFLINE;
                        $theNote->target = $elementId;
                        $theNote->lang = 'en';
                        $theNote->setText((string) $elementXml);
                        // offline notes not supported yet
                        //$col['ednotes'][] = $theNote;
                        $ignore = true;
                        break;
                    }
                    if ($type === 'gloss') {
                        $element = new \AverroesProject\ColumnElement\Gloss();
                        $element->editorId = $pageDiv['defaultEditor'];
                        $readItems = true;
                        break;
                    }
                    // Not a valid note, ignore
                    $ignore = true;
                    break;
                    
                default:
                    // Not valid element, ignore
                    $ignore = true;
            }
            if ($ignore) {
                $this->addWarning(self::WARNING_IGNORED_ELEMENT, 
                    sprintf(self::MSG_IGNORED_ELEMENT, $elementXml->getName()), 
                    sprintf("At page div %s, column %d, XML element %d", 
                            $pageDiv['facs'], 
                            $col['colNumber'],
                            $xmlElementCount));
                continue;
            }
            if ($readItems) {
                $itemResult = $this->readItems($elementXml, $elementId, $itemId, $col['ednotes']);
                $element->items = $itemResult['items'];
                $col['ednotes'] = $itemResult['ednotes'];
                $itemId += count($itemResult['items']);
            } 
            if (!$gap){
                $element->id = $elementId;
                $element->lang = $this->getLang($elementXml);
                $element->columnNumber = $col['colNumber'];
                $element->seq = $elementSeq;
                $element->editorId = 0;
                $col['elements'][] = $element;
                $elementSeq++;
                $elementId++;
            }
        }
        if (count($additions) > 0 ) {
            // Check and update targets
            $ids = [];
            foreach($col['elements'] as $element){
                foreach($element->items as $item) {
                    if ($item instanceof \AverroesProject\TxText\Mark || 
                        $item instanceof \AverroesProject\TxText\Deletion) {
                        $ids[] = ['itemId' => $item->id, 'xmlId' => $item->getXmlId() ];
                    }
                }
            }
            
            foreach ($additions as $addition) {
                $itemId = $this->searchXmlId($addition['target'], $ids);
                if ($itemId===false ) {
                    $this->setError(self::ERROR_ADD_WIHOUT_VALID_TARGET, 
                            "Addition's target not found: " . $addition['target'], 
                           sprintf("At page div %s, column %d", 
                            $pageDiv['facs'], 
                            $col['colNumber']));
                    return false;
                }
                $col['elements'][$addition['elementId']]->setTargetId($itemId);
            }
        }
        
        return $col;
    }
    
    private function searchXmlId($xmlId, $idArray) 
    {
        
        foreach($idArray as $id){
            if ($id['xmlId'] === $xmlId) {
                return $id['itemId'];
            }
        }
        return false;
    }
    
    private function readItems($sXml, $elementId, $itemId, $ednotes) 
    {
        $reader = new \XMLReader();
        $theXml = $sXml->asXml();
        $reader->XML($theXml);
        $reader->read(); // in the outer element
        $innerXml = $reader->readInnerXml();
        
        /**
         * @todo Support note authors
         */
        $notePattern = (new Pattern())->withTokenSeries([
            XmlToken::elementToken('note')->withReqAttrs([
                ['type', 'editorial']]),
            XmlToken::textToken(),
            XmlToken::endElementToken('note')])
            ->withCallback( function ($matched) use (&$itemId, &$ednotes){
                array_pop($matched); // </note>
                $readData = array_pop($matched); // the text
                array_pop($matched); // <note>
                $note = new \AverroesProject\EditorialNote();
                $note->type= \AverroesProject\EditorialNote::INLINE;
                $note->target = $itemId; 
                //print "Note with target: $itemId\n";                           
                $note->setText($readData['text']);
                $note->lang = 'en';
                $ednotes[] = $note;
                return $matched;
            });
        
        $textPattern = (new Pattern())
                ->withTokenSeries([XmlToken::textToken()])
                ->withCallback( function ($matched) use (&$itemId) {
                    $readData = array_pop($matched);
                    $text= new \AverroesProject\TxText\Text(0, 0, 
                            Item::normalizeString($readData['text']));
                    $text->lang = '';
                    $text->id = $itemId;
                    //print "Text item with id = $itemId\n";
                    $matched[] = $text;
                    $itemId++;
                    return $matched;
                });
                
        $sic1Pattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('sic'),
                    XmlToken::textToken()])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('sic')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    array_pop($matched); // </sic>
                    $readData = array_pop($matched); // text
                    array_pop($matched); // <sic>
                    $item = new \AverroesProject\TxText\Sic(0, 0, 
                        Item::normalizeString($readData['text']));
                    $item->lang = '';
                    $item->id = $itemId;
                    //print "Sic with id: $itemId\n";
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
                
        $sic2Pattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('choice'),
                    XmlToken::elementToken('sic'),
                    XmlToken::textToken(), // theText
                    XmlToken::endElementToken('sic'),
                    XmlToken::elementToken('supplied'),
                    XmlToken::textToken(), // altText
                    XmlToken::endElementToken('supplied')])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('choice')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    $nItems = count($matched);
                    $alt2 = $matched[$nItems-3];
                    $alt1 = $matched[$nItems-6];
                    array_splice($matched, -8);
                    $item = new \AverroesProject\TxText\Sic(0, 0, 
                            Item::normalizeString($alt1['text']), 
                            Item::normalizeString($alt2['text']));
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });

        $initialPattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('hi')
                        ->withReqAttrs([['rend', 'initial']]),
                    XmlToken::textToken()])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('hi')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    array_pop($matched); // </hi>
                    $readData = array_pop($matched); // text
                    array_pop($matched); // <hi>
                    $item = new \AverroesProject\TxText\Initial(0, 0, 
                        Item::normalizeString($readData['text']));
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
                
        $rubricPattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('hi')
                        ->withReqAttrs([['rend', 'rubric']]),
                    XmlToken::textToken()])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('hi')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    array_pop($matched); // </hi>
                    $readData = array_pop($matched); // text
                    array_pop($matched); // <hi>
                    $item = new \AverroesProject\TxText\Rubric(0, 0, 
                        Item::normalizeString($readData['text']));
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
        
        $unclear1Pattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('unclear'),
                    XmlToken::textToken()])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('unclear')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    array_pop($matched); // </unclear>
                    $readData = array_pop($matched); // text
                    array_pop($matched); // <unclear>
                    $item = new \AverroesProject\TxText\Unclear(0, 0, 
                            'unclear',
                            Item::normalizeString($readData['text']));
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
                
        $unclear2Pattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('unclear'),
                    XmlToken::elementToken('choice'),
                    XmlToken::elementToken('unclear'),
                    XmlToken::textToken(), // alt 1
                    XmlToken::endElementToken('unclear'),
                    XmlToken::elementToken('unclear'),
                    XmlToken::textToken(), // alt 2
                    XmlToken::endElementToken('unclear'),
                    XmlToken::endElementToken('choice')])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('unclear')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    $nItems = count($matched);
                    $alt2 = $matched[$nItems-4];
                    $alt1 = $matched[$nItems-7];
                    array_splice($matched, -10);
                    $item = new \AverroesProject\TxText\Unclear(0, 0, 
                            'unclear',
                            Item::normalizeString($alt1['text']), 
                            Item::normalizeString($alt2['text']));
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
                
        $illegiblePattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('unclear'),
                    XmlToken::elementToken('gap')
                        ->withReqAttrs([ 
                            ['reason', '/^[a-z]+$/'], 
                            ['quantity', '/^[0-9]+$/']
                            ])])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('unclear')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    $nItems = count($matched);
                    $gap = $matched[$nItems-2];
                    array_splice($matched, -3);
                    $reason = $gap['attributes']['reason'];
                    if (!\AverroesProject\TxText\Illegible::isReasonValid($reason)) {
                        $this->addWarning(self::WARNING_BAD_ATTRIBUTE, 
                                "Not valid reason '$reason", 
                                "In <unclear><gap reason=...");
                        return $matched;
                    }
                    $quantity = $gap['attributes']['quantity'];
                    if ($quantity <= 0 ) {
                         $this->addWarning(self::WARNING_BAD_ATTRIBUTE, 
                                "Quantity should be 1 or more, got $quantity", 
                                "In <unclear><gap reason=...");
                        return $matched;
                    }
                    $item = new \AverroesProject\TxText\Illegible(0, 0, 
                            $quantity, $reason);
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
                
        $abbrPattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('choice'),
                    XmlToken::elementToken('abbr'),
                    XmlToken::textToken(), // theText
                    XmlToken::endElementToken('abbr'),
                    XmlToken::elementToken('expan'),
                    XmlToken::textToken(), // altText
                    XmlToken::endElementToken('expan')])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('choice')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    $nItems = count($matched);
                    $alt2 = $matched[$nItems-3];
                    $alt1 = $matched[$nItems-6];
                    array_splice($matched, -8);
                    $item = new \AverroesProject\TxText\Abbreviation(0, 0, 
                            Item::normalizeString($alt1['text']), 
                            Item::normalizeString($alt2['text']));
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
        
        $delPattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('del')
                        ->withReqAttrs([['rend', '/.*/']]),
                    XmlToken::textToken()])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('del')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    array_pop($matched); // </del>
                    $readData = array_pop($matched); // text
                    $del = array_pop($matched); // <del>
                    $technique = $del['attributes']['rend'];
                    if (!\AverroesProject\TxText\Deletion::isDeletionTechniqueAllowed($technique)) {
                        $this->addWarning(self::WARNING_BAD_ATTRIBUTE, 
                                "Not valid deletion technique '$technique", 
                                "In <del rend=...");
                        $technique = \AverroesProject\TxText\Deletion::$deletionTechniques[0];
                    }
                    $item = new \AverroesProject\TxText\Deletion(0, 0, 
                        Item::normalizeString($readData['text']),
                            $technique);
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
        
        $gliphPattern = (new Pattern())
        ->withTokenSeries([
            XmlToken::elementToken('g'),
            XmlToken::textToken()])
        ->withAddedPatternZeroOrMore($notePattern)
        ->withTokenSeries([
            XmlToken::endElementToken('g')
           ])
        ->withCallback(function ($matched) use (&$itemId){
            array_pop($matched); // </sic>
            $readData = array_pop($matched); // text
            array_pop($matched); // <sic>
            $item = new \AverroesProject\TxText\Gliph(0, 0, 
                Item::normalizeString($readData['text']));
            $item->lang = '';
            $item->id = $itemId;
            $matched[] = $item;
            $itemId++;
            return $matched;
        });
        
        $noLbPattern = (new Pattern())
            ->withTokenSeries([
                XmlToken::elementToken('lb')
                    ->withReqAttrs([['break', 'no']])
                    ])
            ->withCallback(function ($matched) use (&$itemId){
                array_pop($matched); // <lb/>
                $item = new \AverroesProject\TxText\NoWordBreak(0, 0);
                $item->lang = '';
                $item->id = $itemId;
                $matched[] = $item;
                $itemId++;
                return $matched;
            });
            
        $chGapPattern = (new Pattern())
            ->withTokenSeries([
                XmlToken::elementToken('gap')
                    ->withReqAttrs([
                         ['reason', '/^[a-z]+$/'], 
                         ['quantity', '/^[0-9]+$/'],
                         ['unit', 'character']
                       ])
                    ])
            ->withCallback(function ($matched) use (&$itemId){
                $gap = array_pop($matched); // <gap/>
                $quantity = $gap['attributes']['quantity'];
                $item = new \AverroesProject\TxText\CharacterGap(0,0,$quantity);
                $item->lang = '';
                $item->id = $itemId;
                $matched[] = $item;
                $itemId++;
                return $matched;
            });
            
         $metamarkPattern = (new Pattern())
            ->withTokenSeries([
                XmlToken::elementToken('metamark')
                    ->withReqAttrs([['xml:id', '/.*/']])
                    ])
            ->withCallback(function ($matched) use (&$itemId){
                $metamark = array_pop($matched); // <metamark/>
                $item = new \AverroesProject\TxText\Mark(0, 0);
                $item->setXmlId($metamark['attributes']['xml:id']);
                $item->lang = '';
                $item->id = $itemId;
                $matched[] = $item;
                $itemId++;
                return $matched;
            });
            
        $addPattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('add')
                        ->withReqAttrs([['place', '/.*/']])
                        ->withOptAttrs([['target', '/^#.*/']]),
                    XmlToken::textToken()])
                ->withAddedPatternZeroOrMore($notePattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('add')
                   ])
                ->withCallback(function ($matched) use (&$itemId){
                    array_pop($matched); // </add>
                    $readData = array_pop($matched); // text
                    $add = array_pop($matched); // <add>
                    $place = $add['attributes']['place'];
                    if (!\AverroesProject\TxText\Addition::isPlaceValid($place)) {
                        $this->addWarning(self::WARNING_BAD_ATTRIBUTE, 
                                "Not valid place'$place", 
                                "In <add place=...");
                        $place = \AverroesProject\TxText\Addition::$validPlaces[0];
                    }
                    $item = new \AverroesProject\TxText\Addition(0, 0, 
                        Item::normalizeString($readData['text']),
                            $place);
                    //
                    // I'm not sure we need to support inline targets!
                    //$target = $add['attributes']['target'];
                    //if ($target !== '') {
                    //    $item->targetXmlId = $target;
                    //}
                    $item->lang = '';
                    $item->id = $itemId;
                    $matched[] = $item;
                    $itemId++;
                    return $matched;
                });
        
        $inlineNotePattern = (new Pattern())->withTokenSeries([
            XmlToken::elementToken('note')->withReqAttrs([
                ['type', 'editorial']]),
            XmlToken::textToken(),
            XmlToken::endElementToken('note')])
            ->withCallback( function ($matched) use (&$itemId, &$ednotes){
                array_pop($matched); // </note>
                $readData = array_pop($matched); // the text
                array_pop($matched); // <note>
                // Add the note
                $note = new \AverroesProject\EditorialNote();
                $note->type= \AverroesProject\EditorialNote::INLINE;
                $note->target = $itemId;
                $note->setText($readData['text']);
                $note->lang = 'en';
                $ednotes[] = $note;
                // Add a mark
                
                $item = new \AverroesProject\TxText\Mark(0, 0);
                $item->lang = '';
                $item->id = $itemId;
                $matched[] = $item;
                $itemId++;
                return $matched;
            });
        
        $mod1Pattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('mod')
                        ->withReqAttrs([['type', 'subst'] ,['xml:id', '/.*/']])
                    ])
                ->withAddedPattern($delPattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('mod')
                    ])
                ->withCallback(function ($matched) use (&$itemId){
                    $nItems = count($matched);
                    array_pop($matched); // </mod>
                    $delItem = array_pop($matched); // del
                    $mod = array_pop($matched); // <mod>
                    $delItem->modXmlId = $mod['attributes']['xml:id'];
                    $matched[] = $delItem;
                    return $matched;
                });
        
        $mod2Pattern = (new Pattern())
                ->withTokenSeries([
                    XmlToken::elementToken('mod')
                        ->withReqAttrs([['type', 'subst']])])
                ->withAddedPattern($delPattern)
                ->withAddedPattern($addPattern)
                ->withTokenSeries([
                    XmlToken::endElementToken('mod')
                    ])
                ->withCallback(function ($matched) use (&$itemId){
                    $nItems = count($matched);
                    array_pop($matched); // </mod>
                    $addItem = array_pop($matched); // add
                    $delItem = array_pop($matched); // del
                    array_pop($matched); // <mod>
                    $addItem->setTarget($delItem->id);
                    $matched[] = $delItem;
                    $matched[] = $addItem;
                    return $matched;
                });
        
        $chunkStartPattern = (new Pattern())
            ->withTokenSeries([
                XmlToken::elementToken('chunkstart')
                    ->withReqAttrs([['work', '/.*/'], ['chunkno', '/[0-9]+/']])
                    ])
            ->withCallback(function ($matched) use (&$itemId){
                $chunkElement = array_pop($matched); 
                $workId = $chunkElement['attributes']['work'];
                $chunkNo = (int) $chunkElement['attributes']['chunkno'];
                if ($chunkNo === 0) {
                    $this->addWarning(self::WARNING_BAD_ATTRIBUTE, 
                            "Invalid chunk number " . $chunkElement['attributes']['chunkno'], 
                             "In <chunkstart work=\"$workId\"...");
                    return $matched;
                }
                $item = new \AverroesProject\TxText\ChunkMark(0, 0, $workId, $chunkNo, 'start');
                $item->lang = '';
                $item->id = $itemId;
                $matched[] = $item;
                $itemId++;
                return $matched;
            });
            
        $chunkEndPattern = (new Pattern())
            ->withTokenSeries([
                XmlToken::elementToken('chunkend')
                    ->withReqAttrs([['work', '/.*/'], ['chunkno', '/[0-9]+/']])
                    ])
            ->withCallback(function ($matched) use (&$itemId){
                $chunkElement = array_pop($matched); 
                $workId = $chunkElement['attributes']['work'];
                $chunkNo = (int) $chunkElement['attributes']['chunkno'];
                if ($chunkNo === 0) {
                    $this->addWarning(self::WARNING_BAD_ATTRIBUTE, 
                            "Invalid chunk number " . $chunkElement['attributes']['chunkno'], 
                            "In <chunkend work=\"$workId\"...");
                    return $matched;
                }
                $item = new \AverroesProject\TxText\ChunkMark(0, 0, $workId, $chunkNo, 'end');
                $item->lang = '';
                $item->id = $itemId;
                $matched[] = $item;
                $itemId++;
                return $matched;
            });
                
        $pMatcher = new \XmlMatcher\XmlParallelMatcher([
            $textPattern, 
            $sic1Pattern, 
            $sic2Pattern,
            $initialPattern,
            $rubricPattern,
            $unclear1Pattern,
            $unclear2Pattern,
            $illegiblePattern,
            $abbrPattern,
            $delPattern,
            $addPattern,
            $gliphPattern,
            $noLbPattern,
            $chGapPattern,
            $metamarkPattern,
            $inlineNotePattern,
            $mod1Pattern,
            $mod2Pattern,
            $chunkStartPattern,
            $chunkEndPattern
       ]);
        
        $matchResult = $pMatcher->matchXmlString($innerXml);
        if (!$matchResult) {
            // This can only be a match problem since XML problems
            // would have been detected when reading the whole
            // document
            $this->addWarning(self::WARNING_BAD_ITEM, 
                    "Bad item detected: '" . $pMatcher->matchErrorElement . "'", 
                    "In: $theXml");
        }
        
        $seq = 0;
        $itemArray = [];
        foreach($pMatcher->matched as $matchedArray){
            foreach($matchedArray as $item){
                if ($item instanceof Item){
                    $item->seq = $seq;
                    $item->columnElementId = $elementId;
                    ItemArray::addItem($itemArray, $item);
                    $seq++;
                    continue;
                }
                // This should never happen!
                $this->addWarning(self::WARNING_BAD_ITEM, "Bad Item", $item[0]);
            }
        }
        return [ 'items' => $itemArray, 'ednotes' => $ednotes];
    }
    
    private function getInfoFromHeader($theHeader)
    {
        if (count($theHeader->fileDesc) === 0 ||
            count($theHeader->fileDesc->titleStmt) === 0 ||
            count($theHeader->fileDesc->titleStmt->editor) === 0) {
            $this->setError(self::ERROR_INCORRECT_STRUCTURE, 
                    self::MSG_NO_EDITOR, 
                    "inside of teiHeader; expected \fileDesc\titleStmt\editor");
            return false;
        }
        $editorUsername = (string) $theHeader->fileDesc->titleStmt
                ->editor->attributes('xml', TRUE)['id'];
        if ($editorUsername === '' or $editorUsername === NULL){
            $this->setError(self::ERROR_NO_EDITOR, 
                    self::MSG_NO_EDITOR, "in TEI\teiHeader\fileDesc\titleStmt");
            return false;
        }
        $this->transcription['people'][] = $editorUsername;
        return true;
    }
    
    private function addWarning(int $warningNo, 
            string $warningMsg=self::MSG_GENERIC_WARNING, 
            string $warningContext = '')
    {
        $this->warnings[] = [ 
            'number' => $warningNo, 
            'message' => $warningMsg, 
            'context' => $warningContext];
    }
    
    private function setError(int $errNo, 
            string $msg = self::MSG_GENERIC_ERROR, string $context = '')
    {
        $this->errorNumber = $errNo;
        $this->errorMsg = $msg;
        $this->errorContext = $context;
    }
    
}
