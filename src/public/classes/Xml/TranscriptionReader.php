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

use XMLReader;
use XmlMatcher\XmlMatcher;
use XmlMatcher\XmlToken;
use Matcher\Pattern;

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
    
    const WARNING_IGNORED_ELEMENT = 500;
        
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
    
    public function read($xml)
    {
        $sXml = simplexml_load_string($xml);
        
        if ($sXml === false){
            $errorMsg = '';
            foreach(libxml_get_errors() as $error){
                $errorMsg .= $error . "; ";
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
        if ($defaultLang === '' or $defaultLang === NULL) {
            $this->setError(self::ERROR_XML_LANG_NOT_FOUND, 
                    self::MSG_XML_LANG_REQUIRED, " in <text> element");
            return false;
        }
        
        $this->transcription['defaultLang'] = $defaultLang;
        
        foreach ($sXml->text->body->div as $bodyDiv){
            if (!$this->processBodyDiv($bodyDiv)){
                return false;
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
        if (!$facs){
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
        $lang = (string) $sXml->attributes('xml', TRUE)['lang'];
        if ($lang === NULL) {
            $lang = '';
        }
        return $lang;
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
        $pageDiv['items'] = [];
        $pageDiv['ednotes'] = [];
        
        if (count($sXml->div)>0 || 
                count($sXml->gap) > 0) {
            // First, process the column divs
            foreach ($sXml->div as $cDiv){
                $colNumber = (int) $cDiv['n'];
                if (!$colNumber){
                    // Bad col number
                    return false;
                }
                $pageDiv['cols'][$colNumber] = [];
                $pageDiv['cols'][$colNumber]['defaultLang'] = 
                        $this->getLang($cDiv);

                $readResult = $this->readColumn($cDiv, $pageDiv, $colNumber);
                if ($readResult === false){
                    return false;
                }
                $pageDiv = $readResult;
            }
            
            // Second, get the gaps
            $declaredMissingColumns = 0;
            foreach($sXml->gap as $gap){
                $declaredMissingColumns += (int) $gap['n'];
            }
            $pageDiv['nGaps'] = $declaredMissingColumns;
            return $pageDiv;
        }
       
        // Single column in page div
        
        $pageDiv['cols'][1] = [];
        $pageDiv['cols'][1]['defaultLang'] = $pageDiv['defaultLang'];
        
        $readResult2 = $this->readColumn($sXml, $pageDiv);
        if ($readResult2 === false){
            return false;
        }
        $pageDiv = $readResult2;
        
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
    private function readColumn($sXml, $pageDiv, $colNumber = 1)
    {   
        $nextElementId = count($pageDiv['elements']);
        $nextItemId = count($pageDiv['items']);
        $elementSeq = 1;
        $xmlElementCount = 0;
        $lineNumber = 1;
        
        foreach($sXml as $elementXml){
            $xmlElementCount++;
            $ignore = false;
            $readItems = true;
            switch($elementXml->getName()){
                case 'l':
                    $element = new \AverroesProject\ColumnElement\Line();
                    $element->setLineNumber($lineNumber);
                    $lineNumber++;
                    break;
                
                case 'head':
                    $element = new \AverroesProject\ColumnElement\Head();
                    break;
                
                case 'fw':
                    if ((string) $elementXml['type'] !== 'catch'){
                        // not a custodes, ignore
                        $ignore = true;
                        continue;
                    }
                    $element = new \AverroesProject\ColumnElement\Custodes();
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
                            $colNumber,
                            $xmlElementCount));
                continue;
            }
            if ($readItems) {
                $itemResult = $this->readItems($elementXml, $pageDiv);
                if ($itemResult === false) {
                    return false;
                }
                $pageDiv = $itemResult;
            }
            $element->lang = $this->getLang($elementXml);
            $element->columnNumber = $colNumber;
            $element->seq = $elementSeq;
            $pageDiv['elements'][] = $element;
            $elementSeq++;
        }
        return $pageDiv;
    }
    
    private function readItems($sXml, $pageDiv) 
    {
     
        $textPattern = (new Pattern())->withTokenSeries([XmlToken::textToken()]);
        $sicPattern = (new Pattern())->withTokenSeries([
            XmlToken::elementToken('sic')->withReqAttrs([ ['rend', 'rubric']]),
            XmlToken::textToken(),
            XmlToken::endElementToken('sic')
        ]);
        $pMatcher = new \Matcher\ParallelMatcher([$textPattern, $sicPattern]);
        
        return $pageDiv;
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
