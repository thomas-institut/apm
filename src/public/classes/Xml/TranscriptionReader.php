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
        
        if (!$this->getDefaultLanguageFromTextElement($sXml->text)) {
            return false;
        }
        
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

        if (!$this->isValidPageDiv($sXml)){
            return true;
        }
        $pageDiv = [];
        $pageDiv['id'] = count($this->transcription['pageDivs']);
        $pageDiv['facs'] = (string) $sXml['facs'];
        $pageDiv['lang'] = $this->getLang($sXml);

        $result = $this->processPageDiv($sXml, $pageDiv);
        if ($result === false) {
            return false;
        }
        $this->transcription['pageDivs'][] = $result;
      
        return true;
    }
    
    private function isValidPageDiv($sXml)
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
     * Returns a 
     * 
     * 
     * @param type $sXml
     * @param type $pageDiv
     * @return boolean|array 
     */
    private function processPageDiv($sXml, $pageDiv)
    {
        if (count($sXml->div)>0 || 
                count($sXml->gap) > 0) {
            // First, process the column divs
            foreach ($sXml->div as $cDiv){
                $colNumber = (int) $cDiv['n'];
                if (!$colNumber){
                    // Bad col number
                    return false;
                }
                $colLang = '';
                if ( (string) $cDiv->attributes('xml', TRUE)['lang']){
                    $colLang = (string) $cDiv->attributes('xml', TRUE)['lang'];
                }
                $colTranscription = $this->readColumn($cDiv);
                if ($colTranscription === false){
                    return false;
                }
                $pageDiv['cols'][$colNumber]['transcription'] = 
                        $colTranscription;
                
                $pageDiv['cols'][$colNumber]['lang'] = $colLang;
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
        $colTranscription = $this->readColumn($sXml);
        if ($colTranscription === false){
            return false;
        }
        $pageDiv['cols'][1] = [];
        $pageDiv['cols'][1]['transcription'] = $colTranscription;
        $pageDiv['cols'][1]['lang'] = $pageDiv['lang'];
        return $pageDiv;
    }
    
    public function readColumn($sXml)
    {
        foreach($sXml as $element){
            switch($element->getName()){
                case 'l':
                    
            }
        }
        return [];
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
        $this->transcription['editors'][] = $editorUsername;
        return true;
    }
    
    public function getDefaultLanguageFromTextElement($sXml){
       
        $defaultLang = (string) $sXml->attributes('xml', TRUE)['lang'];
        
        if ($defaultLang === '' or $defaultLang === NULL) {
            $this->setError(self::ERROR_XML_LANG_NOT_FOUND, 
                    self::MSG_XML_LANG_REQUIRED, " in <text> element");
            return false;
        }
       
        $this->transcription['defaultLang'] = $defaultLang;
        return true;
    }
  
    private function addWarning(int $warningNo, 
            string $warningMsg=self::MSG_GENERIC_WARNING, 
            string $warningContext = '')
    {
        $this->warnings[] = [ $warningNo, $warningMsg, $warningContext];
    }
    
    private function setError(int $errNo, 
            string $msg = self::MSG_GENERIC_ERROR, string $context = '')
    {
        $this->errorNumber = $errNo;
        $this->errorMsg = $msg;
        $this->errorContext = $context;
    }
    
    /**
     * Returns the facs and lang attributes from the <div> element.
     * If the element is not valid, returns false.
     *
     * @param XmlReader $reader
     * @return array
     */
    private function getInfoFromPageDivElement($sXml)
    {   
        
        $reader = new XMLReader();
        $reader->XML($sXml->asXml());
        $reader->read();
        $divType = $reader->getAttribute('type');
        if ($divType === NULL || $divType !== 'page'){
            $warningMsg = sprintf(self::MSG_IGNORED_ELEMENT, 
                            "<div type=\"$divType\">");
            $this->addWarning(self::WARNING_IGNORED_ELEMENT, $warningMsg);
            print "Warning: $warningMsg\n";
             return true;
        }
        $pageDivPattern =  (new Pattern())
            ->withTokenSeries([XmlToken::elementToken('div')
                    ->withReqAttrs([ ['type', 'page'], ['facs', '/.*/']])
            ->withOptAttrs([ ['xml:lang', '/.*/']])
        ]);
        $matcher = new XmlMatcher($pageDivPattern);
        $matcher->match($reader);
        if (!$matcher->matchFound()){
            $this->setError(self::ERROR_BAD_PAGE_DIV, self::MSG_BAD_PAGE_DIV);
            return false;
        }
        return [ 'facs' => $matcher->matched[0]['attributes']['facs'],
                 'lang' => $matcher->matched[0]['attributes']['xml:lang']
            ];
    }
    
}
