<?php


namespace APM\CommandLine;

use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\PageInfo;
use APM\System\Transcription\ColumnVersionInfo;
use APM\System\Transcription\TranscriptionManager;
use Exception;
use PDO;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\TimeString\TimeString;

/**
 * Class ColumnVersionFixTool
 *
 * Tool to detect issues with column versions and to try to fix some of them:
 *   - detects inconsistent version sequences (highly unlikely)
 *   - detects a change in page settings that has occurred after the last version registered
 *     for the page's columns that have transcriptions. This should not occur after version 0.28.2.
 *
 * @package APM\CommandLine
 */
class ColumnVersionFixTool extends ApmCliUtility
{
    const string USAGE = "usage: columnversionfixtool.php doc|page <id> [fix]\n";

    /**
     * @throws NotFoundExceptionInterface
     * @throws DocumentNotFoundException
     * @throws ContainerExceptionInterface
     */
    public function main(int $argc, array $argv): bool
    {
        if ($argc < 3) {
            print self::USAGE;
            return false;
        }
        $coldRun = true;
        if (isset($argv[3]) && $argv[3] === 'fix') {
            $coldRun = false;
        }

        switch ($argv[1]) {
            case 'doc' :
                if ($argv[2] === 'all') {
//                    $docIds = $this->getDm()->getDocIdList();
//                    $this->logger->debug("Checking all documents in the system: " . count($docIds) . " in total");
//                    foreach($docIds as $docId) {
//                        $this->processDoc($docId, false, $coldRun);
//                    }
//                    return true;
                    echo "Processing all documents at once temporarily not supported\n";
                    return true;
                } else {
                    $docId = (int)$argv[2];
                    return $this->processDoc($docId, false, $coldRun);
                }


            case 'page':
                $pageId = (int)$argv[2];
                /** @var DocumentManager $dm */
                $dm = $this->container->get(DocumentManager::class);
                try {
                    $pageInfo = $dm->getPageInfo($pageId);
                } catch (Exception $e) {
                    $this->logger->error($e->getMessage());
                    return false;
                }
                $this->logger->debug("Checking page $pageId (doc $pageInfo->docId : p $pageInfo->pageNumber)");
                return $this->processPageInfo($pageInfo, true, $coldRun);

            default:
                print "Invalid option " . $argv[1] . "\n";
                print self::USAGE;
                return false;
        }
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function processPageInfo(PageInfo $pageInfo, bool $fullDebug, bool $coldRun): bool
    {
        /** @var TranscriptionManager $tm */
        $tm = $this->container->get(TranscriptionManager::class);

        $cvm = $tm->getColumnVersionManager();
        $issuesFound = false;
        if ($fullDebug) {
            $this->logger->debug("Page has " . $pageInfo->numCols . " column(s)");
        }
        for ($i = 1; $i <= $pageInfo->numCols; $i++) {
            $versions = $cvm->getColumnVersionInfoByPageCol($pageInfo->pageId, $i);
            if ($versions === []) {
                if ($fullDebug) {
                    $this->logger->debug("No versions found for column $i");
                }
                continue;
            }
            // check that versions are coherent
            if ($fullDebug) {
                $this->logger->debug(count($versions) . " versions for column $i");
            }
            $issues = $cvm->checkVersionSequenceConsistency($versions);
            if ($issues !== []) {
                $issuesFound = true;
                $this->logger->error("Inconsistencies in page $pageInfo->pageId, col $i ($pageInfo->docId:$pageInfo->pageNumber), cannot fix automatically", $issues);
                continue;
            }
            if ($fullDebug) {
                $this->logger->debug("Version sequence is consistent");
            }
            // determine if there's a change in page settings after the last version
            $lastVersionTime = $versions[count($versions) - 1]->timeFrom;
            if ($fullDebug) {
                $this->logger->debug("Last version: " . $lastVersionTime);
            }
            $lastPageChangeTime = $this->getLastPageSettingsChangeTime($pageInfo->pageId);
            if ($fullDebug) {
                $this->logger->debug("Last page info change: " . $lastPageChangeTime);
            }
            if (strcmp($lastPageChangeTime, $lastVersionTime) > 0) {
                $issuesFound = true;
                $this->logger->info("Last page change occurred after last version for page $pageInfo->pageId, col $i ($pageInfo->docId:$pageInfo->pageNumber)",
                    ['lastPageChangeTime' => $lastPageChangeTime, 'lastVersionTime' => $lastVersionTime]
                );

                $versionInfo = new ColumnVersionInfo();
                $versionInfo->pageId = $pageInfo->pageId;
                $versionInfo->column = $i;
                $versionInfo->isMinor = false;
                $versionInfo->isReview = false;
                $versionInfo->authorTid = $versions[count($versions) - 1]->authorTid;
                $versionInfo->timeFrom = $lastPageChangeTime;
                $versionInfo->description = "Changes to page info (version automatically generated by APM admin)";

                $this->logger->debug("New version to be added", $versionInfo->getDatabaseRow());
                if ($coldRun) {
                    $this->logger->debug("Cold run, nothing done");
                } else {
                    $tm->getColumnVersionManager()->registerNewColumnVersion($pageInfo->pageId, $i, $versionInfo);
                    $this->logger->info("New version added");
                }

            }
        }
        return !$issuesFound;
    }

    /**
     * @param int $docId
     * @param bool $fullDebug
     * @param bool $coldRun
     * @return bool
     * @throws ContainerExceptionInterface
     * @throws DocumentNotFoundException
     * @throws NotFoundExceptionInterface
     */
    private function processDoc(int $docId, bool $fullDebug, bool $coldRun = true): bool
    {
        /** @var DocumentManager $dm */
        $dm = $this->container->get(DocumentManager::class);

        try {
            $docInfo = $dm->getDocInfo($docId);
        } catch (Exception $e) {
            $this->logger->error($e->getMessage());
            return false;
        }

        $pageInfoArray = $dm->getDocPageInfoArray($docId);


        $this->logger->debug("Checking column versions for doc $docId: " . $docInfo->title . ",  " .
            count($pageInfoArray) . " pages");

        $issuesFound = false;
        foreach ($pageInfoArray as $pageInfo) {
            if (!$this->processPageInfo($pageInfo, $fullDebug, $coldRun)) {
                $issuesFound = true;
            }
        }

        if (!$issuesFound) {
            $this->logger->debug("No issues found in doc $docId");
        }
        return true;
    }

    /**
     */
    private function getLastPageSettingsChangeTime($pageId): string
    {

        $query = "SELECT * FROM ap_pages WHERE id=$pageId  AND valid_until='" . TimeString::END_OF_TIMES . "'";

        $result = $this->getDbConn()->query($query);

        $row = $result->fetch(PDO::FETCH_ASSOC);
        return $row['valid_from'];
    }
}