<?php


namespace AverroesProject\CommandLine;


class VersionsAnalyzer extends CommandLineUtility
{

    const DB_TIME_FORMAT = 'Y-m-d H:i:s.u';

    const THRESHHOLD_DIFF = 1.0;

    public function main($argc, $argv)
    {

        $db = $this->systemManager->getDbConnection();
        $dbh = $this->dm->getMySqlHelper();

        $nrows = $dbh->getSingleValue('select count(*) from ap_elements');

        $pages = $dbh->getAllRows('SELECT * FROM ap_pages WHERE valid_until>\'9999-12-31\' ORDER BY doc_id, page_number ASC');

        foreach ($pages as $page) {

            for ($i = 1; $i <= intval($page['num_cols']); $i++ ) {
                //print "# Processing page " . $page['id'] . ' col ' . $i . "\n";
                $elementTimes = $dbh->getAllRows('SELECT \'E\' as type, id, valid_from as t from ap_elements WHERE page_id=' . $page['id'] . ' AND column_number=' . $i);
                $itemTimes = $dbh->getAllRows('SELECT \'I\' as type, ap_items.id, ap_items.valid_from as t from ap_items, ap_elements WHERE ap_items.ce_id=ap_elements.id AND ap_elements.page_id='
                    . $page['id'] . ' AND ap_elements.column_number=' . $i );

                $timeRows = array_merge($elementTimes, $itemTimes);

                $times = array_column($timeRows, 't');

                array_multisort($times, SORT_ASC, $timeRows);


                $lastTime = '2015-01-01 00:00:00.000000';
                foreach ($timeRows as $row) {
                    $t = $row['t'];
                    $tdiff = $this->getTimeDiffInSeconds($lastTime, $t);

                    if ($tdiff <= self::THRESHHOLD_DIFF) {
                        if ($tdiff > 0) {
                            //print '# Change ' . $row['type'] . ' ' . $row['id'] . ' row from ' . $t . ' to ' . $lastTime;
                            //print "\n";

                            if ($row['type'] === 'E') {
                                $query = 'UPDATE ap_elements SET valid_from=\'' . $lastTime .
                                    '\' WHERE id=' . $row['id'] . ' AND valid_from=\'' . $t . '\';' ;
                                print $query . "\n";
                                $query = 'UPDATE ap_elements SET valid_until=\'' . $lastTime .
                                    '\' WHERE id=' . $row['id'] . ' AND valid_until=\'' . $t . '\';' ;
                                print $query . "\n";

                            } else {
                                $query = 'UPDATE ap_items SET valid_from=\'' . $lastTime .
                                    '\' WHERE id=' . $row['id'] . ' AND valid_from=\'' . $t . '\';' ;
                                print $query . "\n";
                                $query = 'UPDATE ap_items SET valid_until=\'' . $lastTime .
                                    '\' WHERE id=' . $row['id'] . ' AND valid_until=\'' . $t . '\';' ;
                                print $query . "\n";
                            }
                        }
                        else {
                            //print '# No change in ' . $row['type'] . ' ' . $row['id'];
                            //print "\n";
                        }
                        continue;
                    }

                    //print "\n";
                    //print '# Version detected  at page ' . $page['id'] . ' col ' . $i . ' @ ' . $t;
                    //print "\n";

                    $query = 'INSERT INTO ap_versions_tx (page_id, col, time)  VALUES (';

                    $query .= implode(',', [
                       $page['id'],
                       $i,
                       "'" . $t . "'"
                    ]);

                    $query .= ");";

                    //print implode("\t", [ $page['id'], $i, $row['type'], $row['id'], $t, $tdiff ]);
                    print $query;
                    print "\n";
                    $lastTime = $t;
                }
            }
        }
    }

    protected function getTimeDiffInSeconds(string $t1, string $t2) {

        $dt1 = date_create_from_format(self::DB_TIME_FORMAT, $t1);
        $dt2 = date_create_from_format(self::DB_TIME_FORMAT, $t2);

        $tdiffsecs = $dt2->getTimestamp() - $dt1->getTimestamp();
        $tdiffsecs += (intval($dt2->format('u')) - intval($dt1->format('u')))/1000000.0;
        return $tdiffsecs;
    }
}