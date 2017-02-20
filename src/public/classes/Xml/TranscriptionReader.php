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
    
    const MSG_GENERIC_ERROR = 'Error found';
    const MSG_GENERIC_WARNING = 'Warning';
    const MSG_END_OF_FILE = 'End of file found';
    const MSG_LOOKING_FOR_TEI = 'Looking for <TEI>';
    const MSG_LOOKING_FOR_TEI_HEADER = "Looking for <teiHeader> inside <TEI>";
    const MSG_IGNORED_ELEMENT = "Ignored element <%s>";
    const MSG_NO_EDITOR = "No editor username given";
    const MSG_EXPECTED_ELEMENT = "Expected <%s>, got <%s>";
    const MSG_NOT_TEI = "The given XML is not a TEI document";
    const MSG_LOOKING_FOR_TEXT_ELEMENT = "Looking for <text> element";
    const MSG_XML_LANG_REQUIRED = "xml:lang attribute is required";
    const MSG_LOOKING_FOR_BODY_ELEMENT = "Looking for <body> inside <text>";
    const MSG_LOOKING_FOR_PAGE_DIV = "Looking for page <div> inside <body>";
    const MSG_BAD_PAGE_DIV = "Bad page <div>, expected <page type='page' facs='[pageId]'";
    
    const WARNING_IGNORED_ELEMENT = 500;
    
    public $transcription;
    
    
    public $errorNumber;
    public $errorMsg;
    public $errorContext;
    
    public $warnings;
    
    
    public function __construct()
    {
        $this->transcription = [];
        $this->reset();
        
    }
    
    public function reset(){
        $this->transcription['elements'] = [];
        $this->transcription['items'] = [];
        $this->transcription['ednotes'] = [];
        $this->transcription['editors'] = [];
        $this->transcription['defaultLang'] = '';
        $this->transcription['pageDivs'] = [];
        $this->transcription['countBodyDivsProcessed'] = 0;
        $this->errorNumber = self::ERROR_NO_ERROR;
        $this->errorMsg = '';
        $this->warnings = [];
    }
    
    
    public function read(\XMLReader $reader)
    {
        if (!$this->getInfoFromHeader($reader)) {
            return false;
        }
        
        if (!$this->getDefaultLanguageFromTextElement($reader)) {
            return false;
        }
        
        if (!$this->fastForwardToElement($reader, 'body',self::MSG_LOOKING_FOR_BODY_ELEMENT)){
            return false;
        }
        
        // Move to the next element
        XmlMatcher::advanceReader($reader); 
        
        while ($reader->nodeType === \XMLReader::ELEMENT && $reader->name==='div'){
            $divXml = $reader->readOuterXml();
            if (!$this->processBodyDiv($divXml)){
                return false;
            }
            $reader->next('div');
            
        }
        
        // No need to check the end of the file; if there were unclosed tags
        // the XmlReader would have complained already!
        return true;
    }
    
    public function processBodyDiv($xml){
        $this->transcription['countBodyDivsProcessed']++;
        
        $reader = new XMLReader();
        $reader->XML($xml);
        $reader->read();
        print "\n---\nAt $reader->nodeType, $reader->name\n";
        
        $divType = $reader->getAttribute('type');
        if ($divType === NULL || $divType !== 'page'){
            print "Not a page, nothing to do\n";
            return true;
        }
        
        $pageDivPattern =  (new Pattern())
            ->withTokenSeries([XmlToken::elementToken('div')->withReqAttrs([ ['type', 'page'], ['facs', '/.*/']])
            ->withOptAttrs([ ['xml:lang', '/.*/']])
        ]);
        $matcher = new XmlMatcher($pageDivPattern);
        $matcher->match($reader);
        if (!$matcher->matchFound()){
            $this->setError(self::ERROR_BAD_PAGE_DIV, self::MSG_BAD_PAGE_DIV);
            return false;
        }
        
        // Build new page div
        $pageDiv = [];
        $pageDiv['id'] = count($this->transcription['pageDivs']);
        $pageDivXml = $reader->readInnerXml();
        print "Page Div XML: $pageDivXml\n";
        
        // Check for column divs or gap element
        XmlMatcher::advanceReader($reader);
        print "At $reader->nodeType, $reader->name\n";
        
        $columnDivPattern = (new Pattern())
            ->withTokenSeries([XmlToken::elementToken('div')->withReqAttrs([ ['type', 'column']])
            ->withOptAttrs([ ['xml:lang', '/.*/'], ['n', '/\d+/']])
        ]);
        $gapPattern = (new Pattern())
            ->withTokenSeries([XmlToken::elementToken('gap')->withReqAttrs([ ['unit', 'column'], ['reason', 'pending-transcription']])
            ->withOptAttrs([ ['xml:lang', '/.*/'], ['n', '/\d+/']])
        ]);
        $matcherColumn = new XmlMatcher($columnDivPattern);
        $matcherGap = new XmlMatcher($gapPattern);
        
        $matcherColumn->match($reader);
        $matcherGap->match($reader);
        $gapOrColumnFound = false;
        $pageDiv['countGapsAndColumns'] = 0;
        while ($matcherGap->matchFound() or $matcherColumn->matchFound()) {
            $gapOrColumnFound = true;
            print "Gap or column found\n";
            $pageDiv['countGapsAndColumns']++;
            if ($matcherGap->matchFound()) {
                for ($i=0; $i<$matcherGap->matched[0]['attributes']['n']; $i++){
                    $pageDiv['cols'][] = [];
                }
            } else {
                // column div 
                $currentColumn = $matcherColumn->matched[0]['attributes']['n']-1;
                $columnDivXml = $reader->readInnerXml();
                $colTranscription = $this->readColumn($columnDivXml);
                if ($colTranscription === false){
                    return false;
                }
                $pageDiv['cols'][$currentColumn] = $colTranscription;
            }
            XmlMatcher::advanceReader($reader);
            print "At $reader->nodeType, $reader->name\n";
            $matcherColumn->reset();
            $matcherColumn->match($reader);
            $matcherGap->reset();
            $matcherGap->match($reader);
        }
        // No column or gaps, read elements
        if (!$gapOrColumnFound){
            $colTranscription = $this->readColumn($pageDivXml);
            if ($colTranscription === false){
                return false;
            }
            $pageDiv['cols'][] = $colTranscription;
        }
        
        $this->transcription['pageDivs'][] = $pageDiv;
        return true;
    }
    
    public function readColumn($xml)
    {
        return [];
    }
    
    public function getInfoFromHeader(\XMLReader $reader)
    {
        // 1. Get editor username
        if (!$this->fastForwardToElement($reader, 'TEI', self::MSG_LOOKING_FOR_TEI, true)) {
            if ($this->errorNumber === self::ERROR_WRONG_ELEMENT){
                $this->setError(self::ERROR_NOT_TEI, self::MSG_NOT_TEI, self::MSG_LOOKING_FOR_TEI);
            }
            return false;
        }
        if (!$this->fastForwardToElement($reader, 'teiHeader', self::MSG_LOOKING_FOR_TEI_HEADER)) {
            return false;
        }
        $theHeader = simplexml_load_string($reader->readOuterXml());
        if (!isset($theHeader->fileDesc->titleStmt->editor)){
            $this->setError(self::ERROR_INCORRECT_STRUCTURE, self::MSG_NO_EDITOR, "inside of teiHeader; expected \fileDesc\titleStmt\editor");
            return false;
        }
        $editorUsername = (string) $theHeader->fileDesc->titleStmt->editor->attributes('xml', TRUE)['id'];
        if ($editorUsername === '' or $editorUsername === NULL){
            $this->setError(self::ERROR_NO_EDITOR, self::MSG_NO_EDITOR, "in TEI\teiHeader\fileDesc\titleStmt");
            return false;
        }
        $this->transcription['editors'][] = $editorUsername;
        return true;
    }
    
    public function getDefaultLanguageFromTextElement(\XMLReader $reader){
        
        if (!$this->fastForwardToElement($reader, 'text', self::MSG_LOOKING_FOR_TEXT_ELEMENT)) {
            return false;
        }
        if ($reader->getAttribute('xml:lang') === NULL){
            $this->setError(self::ERROR_XML_LANG_NOT_FOUND, self::MSG_XML_LANG_REQUIRED, " in <text> element");
            return false;
        }
        $this->transcription['defaultLang'] = $reader->getAttribute('xml:lang');
        return true;
    }
  
    /**
     * Advances an XMLReader object until the next XML element
     * with the given name
     * 
     * @param XMLReader $reader
     * @param string $elementName
     * @param type $errorContext
     * @return boolean
     */
    public function fastForwardToElement(XMLReader $reader, string $elementName, $errorContext = '', $strictMode = false){
        
        while ($reader->read()){
            if ($reader->nodeType === XMLReader::ELEMENT){
                if ($reader->name === $elementName){
                    return true;
                }
                if ($strictMode) { 
                    $this->setError(self::ERROR_WRONG_ELEMENT, sprintf(self::MSG_EXPECTED_ELEMENT, $elementName, $reader->name));
                    return false;
                }
                $this->addWarning(self::WARNING_IGNORED_ELEMENT, sprintf(self::MSG_IGNORED_ELEMENT, $reader->name), $errorContext);
            }
        }
        $this->setError(self::ERROR_EOF, self::MSG_END_OF_FILE, $errorContext);
        return false;
    }

    private function addWarning(int $warningNo, string $warningMsg=self::MSG_GENERIC_WARNING, string $warningContext = ''){
        $this->warnings[] = [ $warningNo, $warningMsg, $warningContext];
    }
    
    private function setError(int $errNo, string $msg = self::MSG_GENERIC_ERROR, string $context = ''){
        $this->errorNumber = $errNo;
        $this->errorMsg = $msg;
        $this->errorContext = $context;
    }
    
}
