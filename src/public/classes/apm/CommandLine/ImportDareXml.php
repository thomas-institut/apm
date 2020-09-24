<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace APM\CommandLine;

use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use InvalidArgumentException;
use XMLReader;
use function json_encode;

class ImportDareXml extends CommandLineUtility
{

    const USAGE = "usage: importdarexml [--output html|json ] [<filename>]\n";

    protected function main($argc, $argv)
    {

        $fileName = 'php://stdin';
        $outputType = 'html';
        $options = getopt('', [ 'output:'], $index);
        if (isset($options['output'])) {
            $outputType = $options['output'];
        }
        if ($index < count($argv)) {
            $fileName = $argv[$index];
        }


        error_reporting(E_ALL & ~E_WARNING);
        $xmlString = file_get_contents($fileName);

        if ($xmlString === false) {
            $msg = "Can't read file '$fileName'";
            $this->printErrorMsg($msg);
            return false;
        }


        try {
            $dareData = $this->getDareData($xmlString);
        } catch( InvalidArgumentException $e) {
            $this->printErrorMsg($e->getMessage());
            return false;
        }

        $apmData = $this->getApmDataFromDareData($dareData);

        switch($outputType) {
            case 'html':
                $this->outputHtml($dareData);
                break;

            case 'json':
                $errors = $dareData['errors'];
                if ($errors !== []) {
                    $this->printStdErr("Errors found:\n");
                    foreach($errors as $error) {
                        $this->printStdErr(" - $error\n");
                    }
                }
                $this->outputJson($apmData);
                break;
        }

        return true;
    }


    private function getApmDataFromDareData($dareData) : array {
        $apmData = [];

        foreach($dareData['columns'] as $dareColumnData) {
            $apmData[] = [
                'page' => $dareColumnData['darePage'],
                'column' => $this->getApmColumnNumberFromDareColumnN($dareColumnData['dareColumn']),
                'data' => $this->getElementDataFromDareLines(
                    intval($dareColumnData['darePage']),
                    $this->getApmColumnNumberFromDareColumnN($dareColumnData['dareColumn']),
                    $dareData['lang'],
                    0,
                    $dareColumnData['lines'])
            ];
        }

        return $apmData;

    }

    private function getElementDataFromDareLines(int $pageId, int $col, string $lang, int $userId, array $lines) : array {
        $elements = [];
        $currentElementId = 0;
        $currentItemId = 1;

        foreach($lines as $line) {
            $currentSeq = 0;
            $element = [
                'id' => $currentElementId++,
                'type' => Element::LINE,
                'pageId' => $pageId,
                'columnNumber' => $col,
                'seq' => $currentSeq++,
                'lang' => $lang,
                'handId' => 0,
                'editorId' => $userId,
                'items' => [],
                'reference' => -1,
                'placement' => ''
            ];

            //$requiredItemProperties = ['id', 'type',
            // 'seq', 'lang', 'theText', 'altText', 'extraInfo',
            // 'target', 'columnElementId'];
            foreach($line as $dareItem) {
                switch($dareItem['type']) {
                    case 'text':
                        $element['items'][] = [
                            'id' =>  $currentItemId++,
                            'type' => Item::TEXT,
                            'seq' => $currentSeq++,
                            'lang' => $lang,
                            'theText' => $dareItem['value'],
                            'handId'=> 0,
                            'altText' => '',
                            'extraInfo' => '',
                            'target' => -1,
                            'columnElementId' => -1,
                            'length' => 0
                        ];
                        break;

                    case 'head':
                        $element['items'][] = [
                            'id' => $currentItemId++,
                            'type' => Item::HEADING,
                            'seq' => $currentSeq++,
                            'lang' => $lang,
                            'theText' => $dareItem['value'],
                            'altText' => '',
                            'extraInfo' => '',
                            'handId'=> 0,
                            'target' => -1,
                            'columnElementId' => -1,
                            'length' => 0
                        ];
                        break;

                    case 'nowb':
                        $element['items'][] = [
                            'id' => $currentItemId++,
                            'type' => Item::NO_WORD_BREAK,
                            'seq' => $currentSeq++,
                            'lang' => $lang,
                            'theText' => '',
                            'altText' => '',
                            'extraInfo' => '',
                            'target' => -1,
                            'handId'=> 0,
                            'columnElementId' => -1,
                            'length' => 0
                        ];
                        break;

                    case 'chunk_mark':
                        $element['items'][] = [
                            'id' => $currentItemId++,
                            'type' => Item::CHUNK_MARK,
                            'seq' => $currentSeq++,
                            'lang' => $lang,
                            'theText' => $dareItem['value'],
                            'altText' => $dareItem['subtype'],
                            'extraInfo' => 'A',
                            'target' => -1,
                            'columnElementId' => -1,
                            'length' => 1
                        ];
                        break;
                }
            }
            $elements[] = $element;
        }
        return [ 'elements' => $elements, 'ednotes' => []];
    }

    private function getDareData(string $xmlString) : array {

        libxml_use_internal_errors(true);
        $sXml = simplexml_load_string($xmlString);


        if ($sXml === false){
            $errorMsg = '';
            foreach(libxml_get_errors() as $error){
                $errorMsg .= $error->message . "; ";
            }
            throw new InvalidArgumentException("Bad XML: $errorMsg");
        }

        $dareWorkId = (string) $sXml->teiHeader->fileDesc->titleStmt->attributes('xml', true)->id;
        $work = explode('_', $dareWorkId )[0];
        $lang = substr(explode('_', $dareWorkId )[1], 0, 2);
        //$this->printStdErr("Work: $work\nLang: $lang\n");
        $bodyXml = $sXml->text->body->asXML();

        $reader = new XMLReader();
        $reader->XML($bodyXml);

        $state = 0;

        $columns = [];
        $currentLine = [];
        $errors = [];
        $openElement = '';
        $rend = '';

        while($reader->read()){
            if ($reader->nodeType === XMLReader::SIGNIFICANT_WHITESPACE) {
                // ignore xml whitespace
                continue;
            }
            //print "::STATE: $state, node type: " . $reader->nodeType . "\n";
            switch($state) {
                case 0:
                    if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'body') {
                        $state = 1;
                    } else {
                        $state = 3; // error
                        break 2;
                    }
                    break;

                case 1:
                    if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'pb') {
                        $columns[] = [
                            'darePage' =>$reader->getAttribute('n'),
                            'dareColumn' => 'a',
                            'lines' => []
                        ];
                        $currentLine = [];
                        $state = 2;
                    } else {
                        $state = 3; // error
                        break 2;
                    }
                    break;

                case 2:
                    switch($reader->nodeType) {
                        case XMLReader::ELEMENT:
                            switch ($reader->name) {
                                case 'pb':
                                    if (count($currentLine) !== 0) {
                                        $columns[count($columns)-1]['lines'][] = $this->optimizeLine($currentLine);
                                    }
                                    $columns[] =  [
                                        'darePage' =>$reader->getAttribute('n'),
                                        'dareColumn' => 'a',
                                        'lines' => []
                                    ];
                                    $currentLine = [];
                                    break;

                                case 'head':
                                    $openElement = 'head';
                                    $state = 5;
                                    break;

                                case 'lb':
                                    $columns[count($columns)-1]['lines'][] = $this->optimizeLine($currentLine);
                                    $currentLine = [];
                                    break;

                                case 'cb':
                                    // just save the column name in the page
                                    $columns[count($columns)-1]['dareColumn'] = $reader->getAttribute('n');
                                    break;

                                case 'wb':
                                    // word break = non word-breaking hyphen
                                    $currentLine[] = [ 'type' => 'nowb', 'value' => ''];
                                    break;

                                case 'anchor':
                                    $anchorType = $reader->getAttribute('type');
                                    switch ($anchorType) {
                                        case 'chunk':
                                            $subtype = explode('_', $reader->getAttribute('subtype'))[1];
                                            $chunkId = $work . '-' . $reader->getAttribute('n');
                                            $currentLine[] = [
                                                'type' => 'chunk_mark',
                                                'value' => $chunkId,
                                                'subtype' => $subtype
                                            ];
                                            break;

                                        case 'chapter':
                                            $subtype = explode('_', $reader->getAttribute('subtype'))[1];
                                            $chapterTitle = $reader->getAttribute('n');
                                            $currentLine[] = [
                                                'type' => 'chapter_mark',
                                                'value' => $chapterTitle,
                                                'subtype' => $subtype
                                            ];
                                            break;

                                        case 'app' :
                                            // change it for a space
                                            $currentLine[] = [ 'type' => 'text', 'value'=> ' '];
                                            break;


                                    }
                                    // ignore the rest for now
                                    break;

                                case 'hi':
                                    $openElement = 'hi';
                                    $rend = $reader->getAttribute('rend');
                                    $state = 5;
                                    break;

                                default:
                                    $errors[] = "Unsupported element '" . $reader->name . "' at page " . count($columns);
                            }
                            break;

                        case XMLReader::TEXT:
                            $currentLine[] = [ 'type' => 'text', 'value'=> $this->normalizeText($reader->value)];
                            break;

                        case XMLReader::END_ELEMENT:
                            if ($reader->name === 'body') {
                                if (count($currentLine) !== 0) {
                                    $columns[count($columns)-1]['lines'][] = $this->optimizeLine($currentLine);
                                }
                                $state = 4;
                                break 2;
                            }
                            break;

                        default:
                            $errors[] = "Unsupported node type " . $reader->nodeType . "' at page " . count($columns);
                    }
                    break;

                case 5:
                    switch($reader->nodeType) {
                        case XMLReader::TEXT:
                            switch ($openElement) {
                                case 'head':
                                    $currentLine[] = [ 'type' => 'head', 'value' => $this->normalizeText($reader->value)];
                                    break;

                                case 'hi':
                                    $currentLine[] = [ 'type' => $rend, 'value' => $this->normalizeText($reader->value)];
                                    break;
                            }

                            $state = 6;
                            break;

                        case XMLReader::END_ELEMENT:
                            // ignore empty elements
                            $state = 2;
                            break;

                        default:
                            $errors[] = "Expected text or element end after element $openElement start";
                            $state = 7; // error
                            break 2;
                    }
                    break;


                case 6:
                    if ($reader->nodeType === XMLReader::END_ELEMENT && $reader->name === $openElement) {
                        $state = 2;
                    } else {
                        $state = 3;
                        break 2;
                    }
                    break;


                default:
                    print "Wrong state $state";
            }
        }

        switch($state) {
            case 3:
                $errors[] = "No body element found\n";
                break;

            case 4:
                //print "Finished without problems!\n";
                break;

            case 7:
                break;

            default:
                $errors[] = "Unexpected end of text element\n";
        }


        return [  'errors' => $errors, 'columns' => $columns, 'lang' => $lang];
    }

    /**
     * Makes the given array of items as concise as possible:
     *   - Consolidates consecutive text items
     * @param array $items
     * @return array
     */
    private function optimizeLine(array $items) : array {
        $optimizedArray = [];

        $currentText = '';
        foreach($items as $item) {
            if ($item['type'] === 'text') {
                $currentText .= $item['value'];
            } else {
                if ($currentText !== '') {
                    $optimizedArray[]= [ 'type' => 'text', 'value' => $this->normalizeText($currentText)];
                }
                $currentText = '';
                $optimizedArray[] = $item;
            }
        }
        if ($currentText !== '') {
            $optimizedArray[] = [ 'type' => 'text', 'value' => $this->normalizeText($currentText)];
        }
        return $optimizedArray;
    }

    private function outputJson($data) {
        print json_encode($data);
    }

    private function outputHtml(array $data) {

        $errors = $data['errors'];
        $columns = $data['columns'];
        $lang = $data['lang'];

        print '<html><head><link rel="stylesheet" type="text/css" href="darexml.css"/></head>';
       if ($errors !== []) {
            print "<h1>Errors</h1><ul>";
            foreach($errors as $error) {
                print "<li>$error</li>";
            }
            print "</ul>";
        }

        foreach($columns as $column) {
            $col = 1;
            if (isset($column['col'])) {
                $col = $this->getApmColumnNumberFromDareColumnN($column['col']);
            }
            print "<h1>" . $column['darePage'] . " : c$col</h1>\n";
            foreach($column['lines'] as $i => $line) {
                print  "<p class=\"line text-$lang\">";
                foreach($line as $item) {
                    switch($item['type']) {
                        case 'text':
                            print htmlspecialchars($item['value']);
                            break;

                        case 'head':
                            print "<b>" . htmlspecialchars($item['value']) . '</b>';
                            break;

                        case 'nowb':
                            print '<span class="nowb">-</span>';
                            break;

                        case 'chunk_mark':
                            $markType = $item['subtype'];
                            $subtypeLabel = $markType === 'start' ? "Start" : "End";
                            print "<span class=\"chunkmark $markType\">$subtypeLabel " .  $item['value'] . '</span>';
                            if ($lang === 'ar' || $lang === 'he') {
                                print "&rlm;";
                            }
                            break;


                        case 'chapter_mark':
                            $markType = $item['subtype'];
                            $subtypeLabel = $markType === 'start' ? "Start" : "End";
                            print "<span class=\"chaptermark $markType\">$subtypeLabel Chapter " .  $item['value'] . '</span>';
                            if ($lang === 'ar' || $lang === 'he') {
                                print "&rlm;";
                            }
                            break;

                        case 'italic':
                            print '<em>' . htmlspecialchars($item['value']) . '</em>';
                    }
                }
                print "</p>\n";
            }
        }
    }

    private function normalizeText(string $text) : string {
        return trim(preg_replace('/\s\s+/', ' ', $text));
    }

    private function getApmColumnNumberFromDareColumnN($dareColumn) {
        return array_search($dareColumn, [ 'INVALID', 'a', 'b', 'c', 'd', 'e']);
    }


}