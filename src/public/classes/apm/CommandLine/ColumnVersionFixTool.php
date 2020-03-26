<?php


namespace APM\CommandLine;

use Exception;
use PDO;
use ThomasInstitut\TimeString\TimeString;

class ColumnVersionFixTool extends CommandLineUtility {
    const USAGE = "usage: columnversionfixtool.php <docId>\n";

    public function main($argc, $argv)
    {
        if ($argc !== 2) {
            print self::USAGE;
            return false;
        }

        $docId = (int) $argv[1];



        $tm = $this->systemManager->getTranscriptionManager();

        try {
            $docInfo = $tm->getDocManager()->getDocInfoById($docId);
        } catch(Exception $e) {
            $this->logger->error($e->getMessage());
            return false;
        }

        $pageInfoArray = $tm->getPageManager()->getPageInfoArrayForDoc($docId);
        $cvm = $tm->getColumnVersionManager();

        $this->logger->debug("Checking column versions for doc $docId: " . $docInfo->title . ",  " .
            count($pageInfoArray) . " pages");

        $issuesFound = false;
        foreach($pageInfoArray as $pageInfo) {
            for($i=1; $i <= $pageInfo->numCols; $i++) {
                $versions = $cvm->getColumnVersionInfoByPageCol($pageInfo->pageId, $i);
                if ($versions === []) {
                    continue;
                }
                // check that versions are coherent
                $issues = $cvm->checkValueSequenceCoherence($versions);
                if ($issues !== []) {
                    $issuesFound = true;
                    $this->logger->error("Issues in page $pageInfo->pageId, col $i ($docId:$pageInfo->pageNumber)", $issues);
                    continue;
                }
                // determine if there's a change in page settings after the last version
                $lastVersionTime = $versions[count($versions)-1]->timeFrom;
                $lastPageChangeTime = $this->getLastPageSettingsChangeTime($pageInfo->pageId);
                if (strcmp($lastPageChangeTime, $lastVersionTime) > 1) {
                    $this->logger->info("Last page change after last version for page $pageInfo->pageId, col $i ($docId:$pageInfo->pageNumber)",
                        [ 'lastPageChangeTime' => $lastPageChangeTime, 'lastVersionTime' => $lastVersionTime]
                        );
                }
            }
        }

        if (!$issuesFound) {
            $this->logger->debug("No issues found in doc $docId");
        }

    }

    private function getLastPageSettingsChangeTime($pageId): string {

        $query = "SELECT * FROM ap_pages WHERE id=$pageId  AND valid_until='" . TimeString::END_OF_TIMES . "'";

        $result = $this->dbh->query($query);

        $row = $result->fetch(PDO::FETCH_ASSOC);
        return $row['valid_from'];
    }
}