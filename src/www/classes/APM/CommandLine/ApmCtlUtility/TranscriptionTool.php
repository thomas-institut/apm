<?php


namespace APM\CommandLine\ApmCtlUtility;


use APM\CommandLine\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use APM\FullTranscription\Exception\PageNotFoundException;
use APM\FullTranscription\PageInfo;
use APM\FullTranscription\PageManager;
use APM\System\ApmMySqlTableName;
use APM\ToolBox\ArrayPrint;

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
    const MAGIC_WORD = 'IKnowWhatImDoing';
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
               $forReal = false;
               if (isset($argv[3]) && $argv[3] === self::MAGIC_WORD) {
                   $forReal = true;
               }
               $data = $this->getPageColumnInfoFromArgumentString($argv[2]);
               if (!$this->reportArgErrors($data, $argv[2])) {
                   return 1;
               }
               [$pageInfo, $columNumber] = $data;
               $this->deleteTranscription($pageInfo, $columNumber, $forReal);
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

    private function getTranscriptionInfo(PageInfo $pageInfo, int $columnNumber) : ?array {
        $txManager = $this->getSystemManager()->getTranscriptionManager();
        $txInfo = [
            'pageId' => $pageInfo->pageId,
            'docId' => $pageInfo->docId,
            'pageNumber' => $pageInfo->pageNumber,
            'columnNumber' => $columnNumber,
            'numCols' => $pageInfo->numCols,
            'foliation' => $pageInfo->foliationIsSet ? "'$pageInfo->foliation'" : 'undefined',
        ];

        $docInfo = $this->getSystemManager()->getDataManager()->getDocById($txInfo["docId"]);
        if ($docInfo === false) {
            $txInfo["error"] = "Doc not found: $txInfo[docId]";
            return $txInfo;
        }
        $txInfo["docTitle"] = $docInfo['title'];
        $txInfo["docType"] = $docInfo['doc_type'];
        $versions = $txManager->getColumnVersionManager()->getColumnVersionInfoByPageCol($txInfo["pageId"], $columnNumber);
        $txInfo["versionCount"] = count($versions);
        if (count($versions) > 0) {
            $txInfo["firstChange"] = $versions[0]->timeFrom;
            $txInfo["lastChange"] = $versions[count($versions) - 1]->timeFrom;
            $txInfo["lastAuthorId"] =  $versions[count($versions) - 1]->authorTid;
        }
        return $txInfo;
    }

    private function printTranscriptionInfo(PageInfo $pageInfo, int $column) : bool {
        $txInfo = $this->getTranscriptionInfo($pageInfo, $column);
        print ArrayPrint::sPrintAssociativeArray($txInfo, ArrayPrint::STYLE_COLUMNS);
        return isset($txInfo["error"]);
    }

    private function deleteTranscription(PageInfo $pageInfo, int $column, bool $forReal = false) : void {
        $pageId = $pageInfo->pageId;
        $docId = $pageInfo->docId;

        if ($this->printTranscriptionInfo($pageInfo,$column, 1)) {
            if ($this->userRespondsYes("Are you sure you want to delete this transcription?")) {
                $tableNames = $this->getSystemManager()->getTableNames();
                $dbConn = $this->getDbConn();
                $edNotes = $tableNames[ApmMySqlTableName::TABLE_EDNOTES];
                $elements = $tableNames[ApmMySqlTableName::TABLE_ELEMENTS];
                $items = $tableNames[ApmMySqlTableName::TABLE_ITEMS];
                $versionsTable = $tableNames[ApmMySqlTableName::TABLE_VERSIONS_TX];
                $txManager = $this->getSystemManager()->getTranscriptionManager();
                $versions = $txManager->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageId, $column);
                $lastAuthor = $versions[count($versions) - 1]->authorTid;

                $dbConn->beginTransaction();

                // 1. Delete ednotes
                $query1 = "DELETE $edNotes  FROM $edNotes, $items, $elements " .
                    "WHERE $elements.page_id=$pageId AND $elements.column_number=$column AND $items.ce_id=$elements.id AND $edNotes.target=$items.id ";
//                print "Query: $query1\n";
                $result = $dbConn->query($query1);
                print " - Deleted " . $result->rowCount() . " editorial notes\n";
                // 2. Delete text items
                $query2 = "DELETE $items FROM $items, $elements " .
                    " WHERE $elements.page_id=$pageId  AND $elements.column_number=$column AND $items.ce_id=$elements.id";
//                print "Query: $query2\n";
                $result = $dbConn->query($query2);
                print " - Deleted " . $result->rowCount() . " items\n";
                // 3. Delete elements
                $query3 = "DELETE FROM $elements WHERE page_id=$pageId AND column_number=$column ";
                print "Query: $query3\n";
                $result = $dbConn->query($query3);
//                print " - Deleted " . $result->rowCount() . " elements\n";

                // 4. Delete versions
                $query4 = "DELETE FROM $versionsTable WHERE page_id=$pageId AND col=$column";
//                print "Query: $query4\n";
                $result = $dbConn->query($query4);
                print " - Deleted " . $result->rowCount() . " versions\n";
                if ($forReal) {
                    $dbConn->commit();
                    $this->getSystemManager()->onTranscriptionUpdated($lastAuthor, $docId,$pageId, $column);
                } else {
                    print "Not really, need the magic word to actually do it.\n";
                    $dbConn->rollBack();
                }
            }
        } else {
            print "\nNothing to delete\n";
        }
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