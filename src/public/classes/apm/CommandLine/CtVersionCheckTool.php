<?php

namespace APM\CommandLine;

class CtVersionCheckTool extends CommandLineUtility
{

    const USAGE = "usage: ctversioncheck check|fix [<ctId1> <ctId2> ... ]\n";

    public function main($argc, $argv): bool
    {
        if ($argc < 2) {
            print self::USAGE;
            return false;
        }

        if ($argv[1] === 'fix') {
            print "Fix tool not implemented yet, just checking for now\n";
        }

        $versionManager = $this->systemManager->getCollationTableManager()->getCollationTableVersionManager();
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
            if ($reportEveryId) {
                print "CtId $ctId:\n";
                for($i=0; $i<count($versions); $i++) {
                    printf("   %2d : %4d : %s -> %s\n", $i, $versions[$i]->id, $versions[$i]->timeFrom, $versions[$i]->timeUntil);
                }
            }
            $issues = $versionManager->checkVersionSequenceConsistency($versions);

            if (count($issues) !== 0) {
                print("Issues found for ctId $ctId\n");
                $issuesFound = true;
                foreach($issues as $issue) {
                    print(" - $issue\n");
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

}