<?php


namespace APM\CommandLine;

use ThomasInstitut\ToolBox\MySqlHelper;

/**
 * Checks the consistency of a MySqlUnitemporal table
 * @package AverroesProject\CommandLine
 */
class UnitemporalConsistency extends CommandLineUtility
{

    const DB_TIME_FORMAT = 'Y-m-d H:i:s.u';
    const USAGE="usage: unitemporalconsistency <table>\n";
    const EOT = '9999-12-31 23:59:59.999999';

    public function main($argc, $argv): bool
    {
        $db = $this->getSystemManager()->getDbConnection();
//        $dbh = $this->getSystemManager()->getMySqlHelper();

        $dbh = new MySqlHelper($db, $this->logger);

        if ($argc != 2) {
            print self::USAGE;
            return false;
        }

        $table = $argv[1];

//        if (!preg_match('/^ap_[a-z]+$/', $table)) {
//            $this->printErrorMsg('Invalid table name');
//            return false;
//        }

        $allRows = $dbh->getAllRows("SELECT * from `$table` ORDER BY id, valid_from");

        if ($allRows === false) {
            $this->printErrorMsg('Error reading data from database');
            return false;
        }
        if (count($allRows) === 0) {
            $this->printErrorMsg("Table $table is empty");
        }

        print "Processing " . count($allRows) . " rows\n";
        $previousId = 0;
        $previousValidUntil = '';
        $endOfHistory = true;
        $inconsistenciesFound = false;
        $proposedQueries = [];
        foreach($allRows as $row) {
            $id = $row['id'];
            $valid_from = $row['valid_from'];
            $valid_until = $row['valid_until'];

            if ($id !== $previousId) {
                // new id
                $previousId = $id;
                $previousValidUntil = $valid_until;
                $endOfHistory = false;
                continue;
            }
            // continuing with the same ID

            if ($endOfHistory) {
                // we're past end of history, so this row is spurious
                print "Inconsistency: id=$id, valid_from = $valid_from, valid_until = $valid_until; row comes after end of history for this id\n";
                $proposedQueries[] = "DELETE FROM $table WHERE id=$id AND valid_from='$valid_from' AND valid_until='$valid_until';";
                $inconsistenciesFound = true;
            }

            // check that valid_until is after valid_from
            if ($this->getTimeDiffInSeconds($valid_from, $valid_until) < 0) {
                print "Inconsistency: id=$id, valid_from = $valid_from, valid_until = $valid_until; valid_until must be later than valid_from\n";
                $inconsistenciesFound = true;
            }

            if ($valid_until === $valid_from) {
                print "Inconsistency?:  id=$id, valid_from = $valid_from, valid_until = $valid_until; valid_until === valid_from\n";
                $inconsistenciesFound = true;
            }

            // check that valid_from is exactly the same as previous valid_until
            if (!$endOfHistory && $valid_from !== $previousValidUntil) {
                print "Inconsistency: id=$id, valid_from = $valid_from, valid_until = $valid_until; valid_from must be $previousValidUntil\n";
                $inconsistenciesFound = true;
                $proposedQueries[] = "UPDATE $table SET valid_from='$previousValidUntil' WHERE id=$id AND valid_from='$valid_from' AND valid_until='$valid_until';";
            }

            // detect end of history for this id
            if ($valid_until === self::EOT) {
                $endOfHistory = true;
            }
            $previousValidUntil = $valid_until;


        }

        if (!$inconsistenciesFound) {
            print "All good, no inconsistencies found.\n";
            return true;
        }

        if (count($proposedQueries) !== 0) {
            print "\nProposed fixes: \n\n";
            foreach($proposedQueries as $query) {
                print "$query\n";
            }
        }

        return true;

    }

    protected function getTimeDiffInSeconds(string $t1, string $t2): float|int
    {

        $dt1 = date_create_from_format(self::DB_TIME_FORMAT, $t1);
        $dt2 = date_create_from_format(self::DB_TIME_FORMAT, $t2);

        $tdiffsecs = $dt2->getTimestamp() - $dt1->getTimestamp();
        $tdiffsecs += (intval($dt2->format('u')) - intval($dt1->format('u')))/1000000.0;
        return $tdiffsecs;
    }
}