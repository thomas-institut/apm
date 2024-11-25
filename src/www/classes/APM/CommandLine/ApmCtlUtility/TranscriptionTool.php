<?php


namespace APM\CommandLine\ApmCtlUtility;


use APM\Api\ApiPeople;
use APM\Api\ApiSystem;
use APM\CommandLine\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use APM\FullTranscription\Exception\PageNotFoundException;
use APM\FullTranscription\PageInfo;
use APM\FullTranscription\PageManager;
use APM\System\ApmMySqlTableName;
use APM\System\Cache\CacheKey;
use PDO;

class TranscriptionTool extends CommandLineUtility implements AdminUtility
{
    const CMD = 'transcription';

    const USAGE = <<<TXT
     transcription <option>
     
     Options:
        info <doc:page[:col]>|<pageId[:col]> : print info about a transcription
        delete <doc:page[:col]>|<pageId[:col]> : delete a transcription
        move <doc:page[:col]>|<pageId[:col]> <doc:page[:col]>|<pageId[:col]>: move a transcription
TXT;

    const DESCRIPTION = "Transcription management functions";
    const FLUSH_SAFE_WORD = 'IKnowWhatImDoing';
    private PageManager $pageManager;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);
        $this->pageManager = $this->getSystemManager()->getTranscriptionManager()->getPageManager();
    }


    public function main($argc, $argv) : int
    {
       if ($argc === 1) {
           print self::USAGE . "\n";
           return 0;
       }

       switch($argv[1]) {
           case 'info':
               if (!isset($argv[2])) {
                   $this->printErrorMsg("Need page and column information");
                   return 1;
               }
               $data = $this->getPageColumnInfoFromArgumentString($argv[2]);
               if (!$this->reportArgErrors($data, $argv[2])) {
                   return 1;
               }
               [$pageInfo, $columNumber] = $data;

               $this->printTranscriptionInfo($pageInfo, $columNumber);
               break;

           case 'delete':
               if (!isset($argv[2])) {
                   $this->printErrorMsg("Need page and column information");
                   return 1;
               }
               $data = $this->getPageColumnInfoFromArgumentString($argv[2]);
               if (!$this->reportArgErrors($data, $argv[2])) {
                   return 1;
               }
               [$pageInfo, $columNumber] = $data;
               $this->deleteTranscription($pageInfo, $columNumber);
               break;

           case 'move':
               if ($argc < 3) {
                   $this->printErrorMsg("Need to/from page and column information");
                   return 1;
               }
               $fromData = $this->getPageColumnInfoFromArgumentString($argv[2]);
               if (!$this->reportArgErrors($fromData, $argv[2])) {
                   return 1;
               }
               [$fromPageInfo, $fromColumNumber] = $fromData;
               $toData = $this->getPageColumnInfoFromArgumentString($argv[3]);
               if (!$this->reportArgErrors($toData, $argv[3])) {
                   return 1;
               }
               [$toPageInfo, $toColumnNumber] = $toData;

               $this->moveTranscription($fromPageInfo, $fromColumNumber, $toPageInfo, $toColumnNumber);
               break;

           default:
               print "Unrecognized option: "  . $argv[1] ."\n";
               return 0;
       }
       return 1;
    }

    private function reportArgErrors(?array $data, string $arg) : bool {
        if ($data === null) {
            $this->printErrorMsg("Invalid page column information: $arg");
            return false;
        }
        /** PageInfo $pageInfo */
        [ $pageInfo, $columNumber] = $data;
        if ($pageInfo === null) {
            $this->printErrorMsg("Page does not exist: $arg");
            return false;
        }
        if ($columNumber === null) {
            $pageId = $pageInfo->pageId;
            $docId = $pageInfo->docId;
            $pageNumber = $pageInfo->pageNumber;
            $this->printErrorMsg("Column does not exist in page $pageId (doc $docId, page number $pageNumber)");
            return false;
        }
        return true;
    }

    /**
     * Parses and argument string and returns an array with information about the page
     *
     * ```[ pageInfoObject, columnNumber]```
     *
     * If the string could not be parsed, returns *null*.
     *
     * The input string can be one of
     * - `doc:<docId>:<pageNumber>[:<columnNumber>]`
     * - `page:<pageId>[:<columnNumber>]`
     *
     * If the given input results in a page that is not defined in the system, *null* is returned in all elements of
     * the output array.
     *
     * If *columnNumber* is not given, it defaults to 1. If the given column number is not defined,
     *  *null* is returned in the last element of the resulting array.
     *
     * @param string $arg
     * @return array|null
     */
    private function getPageColumnInfoFromArgumentString(string $arg) : ?array {


        $fields = explode(':', $arg);

        if (count($fields) === 1) {
            return null;
        }
        $type = strtolower(trim($fields[0]));
        if ($type !== 'doc' && $type !== 'page') {
            return null;
        }
        for ($i = 1; $i < count($fields); $i++) {
            if (!ctype_print($fields[$i])) {
                return null;
            }
        }

        $pageInfo = null;
        $realColumnNumber = null;

        $givenColumnNumber = 1;

        if ($type === 'doc') {
            $givenDocId = intval($fields[1]);
            if (isset($fields[3])) {
                $givenColumnNumber = intval($fields[3]);
            }
            if ($givenColumnNumber > 0 && $givenDocId > 0) {
                $givenPageNumber = intval($fields[2]);
                if ($givenPageNumber > 0) {
                    try {
                        $pageInfo = $this->pageManager->getPageInfoByDocPage($givenDocId, $givenPageNumber);
                        if ($givenColumnNumber <= $pageInfo->numCols) {
                            $realColumnNumber = $givenColumnNumber;
                        }
                    } catch (PageNotFoundException) {
                        // nothing to do, nulls will be returned because real data has not been overwritten
                    }
                }
            }

        } else {
            if (isset($fields[2])) {
                $givenColumnNumber = intval($fields[3]);
            }
            $givenPageId = intval($fields[1]);
            if ($givenColumnNumber > 0 && $givenPageId > 0) {
                try {
                    $pageInfo = $this->pageManager->getPageInfoById($givenPageId);
                    if ($givenColumnNumber <= $pageInfo->numCols) {
                        $realColumnNumber = $givenColumnNumber;
                    }
                } catch (PageNotFoundException) {
                    // nothing to do, nulls will be returned because real data has not been overwritten
                }
            }
        }
        return [ $pageInfo, $realColumnNumber ];
    }

    private function printTranscriptionInfo(PageInfo $pageInfo, int $column, $indent = 3) : void {

        $txManager = $this->getSystemManager()->getTranscriptionManager();
        $pageId = $pageInfo->pageId;
        $docId = $pageInfo->docId;
        $pageNumber = $pageInfo->pageNumber;
        $foliation  = $pageInfo->foliationIsSet ? "'$pageInfo->foliation'" : 'undefined';


        $docInfo = $this->getSystemManager()->getDataManager()->getDocById($docId);
        if ($docInfo === false) {
            $this->printErrorMsg("Could not find page doc $docId");
            return;
        }
        $versions = $txManager->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageId, $column, 0);
        $lastChange = $versions[count($versions) - 1]->timeFrom;
        $creationTime = $versions[0]->timeFrom;

        $docTitle = $docInfo['title'];
        $docType = $docInfo['doc_type'];
        $spaces = str_repeat(' ', $indent);

        $infoTextLines = [];

        $infoTextLines[] = "Page ID: $pageId";
        $infoTextLines[] = "Document ID: $docId";
        $infoTextLines[] = "Document Type: $docType";
        $infoTextLines[] = "Document Title: '$docTitle'";
        $infoTextLines[] = "Page Number: $pageNumber  (seq $pageInfo->sequence, foliation $foliation)";
        $infoTextLines[] = "Column: $column of $pageInfo->numCols";
        $infoTextLines[] = "Versions: " . count($versions);
        $infoTextLines[] = "Creation Time: $creationTime UTC";
        $infoTextLines[] = "Last Change: $lastChange UTC";


        foreach ($infoTextLines as $line) {
            print $spaces . trim($line) . "\n";
        }
    }

    private function deleteTranscription(PageInfo $pageInfo, int $column) : void {
        $pageId = $pageInfo->pageId;
        $docId = $pageInfo->docId;
        $pageNumber = $pageInfo->pageNumber;
        print "Are you sure you want to delete the transcription at page id $pageId, column $column (doc $docId, page number $pageNumber)?\n";
        print "... just kidding, not implemented yet\n";
    }

    private function moveTranscription(PageInfo $fromPage, int $column, PageInfo $toPage, int $toColumn) : void {
        print "... just kidding, not implemented yet\n";
    }


    public function getCommand(): string
    {
        return self::CMD;
    }

    public function getHelp(): string
    {
        return self::USAGE;
    }

    public function getDescription(): string
    {
        return self::DESCRIPTION;
    }
}