<?php

namespace APM\CommandLine;

use APM\System\ApmMySqlTableName;
use Exception;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\RowDoesNotExist;

class CtVersionCheckTool extends CommandLineUtility
{

    const USAGE = "usage: ctversioncheck check|fix [<ctId1> <ctId2> ... ]\n";

    /**
     * @throws RowDoesNotExist
     */
    public function main($argc, $argv): bool
    {
        if ($argc < 2) {
            print self::USAGE;
            return false;
        }

        $fix = false;
        if ($argv[1] === 'fix') {
            $fix = true;
        }

        $ctManager = $this->getSystemManager()->getCollationTableManager();
        $versionManager = $ctManager->getCollationTableVersionManager();
        $ctIds = [];
        $reportEveryId = true;
        $issuesFound = false;

        if ($argc === 2) {
            $ctIds = $versionManager->getAllCollationTableIds();
            print("Checking all saved collation tables in the system, " . count($ctIds) . " in total\n");
            $reportEveryId = false;
        } else {
            for ($i=2; $i < $argc; $i++) {
                $ctIds[] = intval($argv[$i]);
            }
        }

        foreach($ctIds as $ctId) {
            $versions = $versionManager->getCollationTableVersionInfo($ctId);
            $storedVersions = $ctManager->getCollationTableStoredVersionsInfo($ctId);

            if ($reportEveryId) {
                print "CtId $ctId:\n";
                print "   Version:\n";
                for($i=0; $i<count($versions); $i++) {
                    printf("      %2d | %4d | %s | %s\n", $i, $versions[$i]->id, $versions[$i]->timeFrom, $versions[$i]->timeUntil);
                }
                print "   Stored:\n";
                for($i=0; $i<count($storedVersions); $i++) {
                    printf("      %2d | %s | %s\n", $i, $storedVersions[$i]->timeFrom, $storedVersions[$i]->timeUntil);
                }
            }
            $tableIssues = $ctManager->checkDataConsistency([ $ctId]);

            $issues = [];
            foreach($tableIssues as $tableIssue) {
                $issues[] = "Data table " . $tableIssue['type'] . " : " . $tableIssue['description'];
            }
            $dataTableFixes = false;

            if (count($issues) !== 0) {
                if ($fix) {
                    $dataTableFixes = true;
                }

            }
            else {
                // only check the rest when there's no data table issues
                $issues = $versionManager->checkVersionSequenceConsistency($versions);
                if (count($versions) !== count($storedVersions)) {
                    $issues[] = "Mismatch between stored versions and version info: " . count($storedVersions) . " stored, " . count($versions) . " info";
                } else {
                    // check consistency between versions
                    for ($i = 0; $i < count($versions); $i++) {
//                        $issue = '';
                        $issueFrom = '';
                        $issueUntil = '';
                        if ($versions[$i]->timeFrom !== $storedVersions[$i]->timeFrom) {
                            $issueFrom = "timeFrom " . $storedVersions[$i]->timeFrom . " !== " . $versions[$i]->timeFrom;
                        }
                        if ($versions[$i]->timeUntil !== $storedVersions[$i]->timeUntil) {
                            $issueUntil = "timeUntil " . $storedVersions[$i]->timeUntil . " !== " . $versions[$i]->timeUntil;
                        }

                        if ($issueFrom !== '' || $issueUntil !== '') {
                            $issue = "Time mismatch index $i: $issueFrom $issueUntil";
                            if ($fix) {
                                $fixed =true;
                                try {
                                    $versionManager->updateTimesForVersion($versions[$i]->id, $storedVersions[$i]->timeFrom, $storedVersions[$i]->timeUntil);
                                } catch(Exception) {
                                    $fixed = false;
                                    $issue .= ".... Sorry, could not fix this problem! ";
                                }
                                if ($fixed) {
                                    $issue .= ".... FIXED";
                                }
                            } else {
                                $issue .= ".... can be fixed automatically";
                            }
                            $issues[] = $issue;
                        }
                    }
                }
            }


            if (count($issues) !== 0) {
                print("Issues found for ctId $ctId\n");
                $issuesFound = true;
                foreach($issues as $issue) {
                    print(" - $issue\n");
                }
                if ($dataTableFixes) {
                    print ("Data table issues must be fixed manually, here's some SQL that will do the trick:\n\n");
                    $this->bruteForceDataTableConsistencyFix($ctId);
                }
            } else {
                if ($reportEveryId) {
                    print "No issues found for ctId $ctId\n";
                }
            }
        }
        if (!$issuesFound && !$reportEveryId) {
            print "No issues found\n";
        }

        return true;

    }


    /**
     * @throws RowDoesNotExist
     */
    private function bruteForceDataTableConsistencyFix($ctId): void
    {
        $tableName = $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_COLLATION_TABLE];
        $dataTable = new MySqlUnitemporalDataTable($this->getSystemManager()->getDbConnection(), $tableName);
        $versions = $dataTable->getRowHistory($ctId);
        if (count($versions) < 2) {
            return;
        }

        for ($i = 1; $i < count($versions); $i++) {
            $currentValidFrom = $versions[$i]['valid_from'];
            $previousValidFrom = $versions[$i-1]['valid_from'];
            print "UPDATE `$tableName` SET `valid_until`='$currentValidFrom' WHERE `id`=$ctId AND `valid_from`='$previousValidFrom';\n";
        }


    }

}