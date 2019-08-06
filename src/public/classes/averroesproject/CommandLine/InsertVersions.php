<?php


namespace AverroesProject\CommandLine;

/**
 * First step in properly entering versions in the database: detect the times for each
 * version and generate SQL to populate the versions table.
 *
 * @package AverroesProject\CommandLine
 */

class InsertVersions extends CommandLineUtility
{

    const DB_TIME_FORMAT = 'Y-m-d H:i:s.u';
    const TIME_FORMAT = 'Y-m-d H:i:s';

    const EOT = '9999-12-31 23:59:59.999999';

    const THRESHHOLD_DIFF = 1.0;

    const VERSIONS_TABLE = 'ap_versions_tx';

    public function main($argc, $argv)
    {

        $db = $this->systemManager->getDbConnection();
        $dbh = $this->dm->getMySqlHelper();

        print "# Insert Versions, start time = " . date(self::TIME_FORMAT) . "\n";

        $partialAnalysis = false;

        if ($argc === 2) {
            $pageId = intval($argv[1]);
            $pages = $dbh->getAllRows("SELECT * FROM ap_pages WHERE valid_until>'9999-12-31' AND id=$pageId");
            $partialAnalysis = true;
            print "# Processing page $pageId only\n";
        } else {
            $pages = $dbh->getAllRows('SELECT * FROM ap_pages WHERE valid_until>\'9999-12-31\' ORDER BY doc_id, page_number ASC');
            print "# Processing all " . count($pages) . " pages.\n";
        }

        $versions = [];
        foreach ($pages as $page) {

            for ($i = 1; $i <= intval($page['num_cols']); $i++ ) {
                $thisColVersions = [];
                $currrentPageId = $page['id'];

                #print "# Processing page " . $page['id'] . ' col ' . $i . "\n";

                $elementFromTimes = $dbh->getAllRows("SELECT valid_from as t FROM ap_elements WHERE page_id=$currrentPageId AND column_number=$i");
                if (count($elementFromTimes) === 0) {
                    if ($partialAnalysis) {
                        print "No elements found in page\n";
                    }
                    continue;
                }
                $elementUntilTimes = $dbh->getAllRows("SELECT valid_until as t FROM ap_elements WHERE page_id=$currrentPageId AND column_number=$i");
                $itemFromTimes = $dbh->getAllRows("SELECT i.valid_from as t FROM ap_items as i, ap_elements  as e WHERE i.ce_id=e.id AND e.page_id=$currrentPageId AND e.column_number=$i");
                $itemUntilTimes = $dbh->getAllRows("SELECT i.valid_until as t FROM ap_items as i, ap_elements  as e WHERE i.ce_id=e.id AND e.page_id=$currrentPageId AND e.column_number=$i");



                $timeRows = array_merge($elementFromTimes, $elementUntilTimes, $itemFromTimes, $itemUntilTimes);


                $times = array_column($timeRows, 't');

                sort($times);

                $lastTime = '2015-01-01 00:00:00.000000';
                $lastVersionIndex = -1;
                $timeClusters = [];
                foreach ($times as $t) {
                    $tdiff = $this->getTimeDiffInSeconds($lastTime, $t);

                    if ($tdiff <= self::THRESHHOLD_DIFF) {
                        if ($lastTime !== $t) {
                            $timeClusters[$lastTime][] = $t;
                        }
                        continue;
                    }
                    $timeClusters[$t] = [];
                    $lastTime = $t;
                }

                // The keys of $timeClusters are the from time for each, except for
                // the last one, if that is EOT
                foreach ($timeClusters as $time => $clusterTimes) {
                    if ($time === self::EOT) {
                        continue;
                    }
                    $versionTime = $time;
                    if (count($clusterTimes) !== 0) {
                        $clusterLastTime = $clusterTimes[count($clusterTimes)-1];
                        print "# Cluster, $currrentPageId, $i, $time, $clusterLastTime, " . (count($clusterTimes)+1);
                        print ", " .  $this->getTimeDiffInSeconds($time, $clusterLastTime)*1000 . "\n";
                        $versionTime = $clusterLastTime;
                    }

                    $thisColVersions[] = [
                        'page_id' => $currrentPageId,
                        'col' => $i,
                        'from' => $versionTime
                    ];
                }
                for ($j = 0; $j < count($thisColVersions)-1; $j++) {
                    $thisColVersions[$j]['until'] = $thisColVersions[$j+1]['from'];
                }
                $thisColVersions[count($thisColVersions)-1]['until'] = self::EOT;

                foreach($thisColVersions as $version) {
                    $versions[] = $version;
                }
            }
        }

        print "# Found " . count($versions) . " versions\n";
        if ($partialAnalysis) {
            print 'DELETE FROM `' . self::VERSIONS_TABLE  . "` WHERE page_id=$pageId;\n";
        } else {
            print 'TRUNCATE `' . self::VERSIONS_TABLE . "`;\n";
        }

        foreach($versions as $version) {
            //print "# " . implode(',', [ $version['page_id'], $version['col'], $version['from']]) . "\n";
            print $this->getInsertVersionSQL($version);
            print "\n";
        }


    }


    protected  function getInsertVersionSQL($version) {
        if (!isset($version['page_id'])) {
            return "# (!!!) no page_id in version\n";
        }

        return sprintf("INSERT INTO `%s` (page_id, col, time_from, time_until) VALUES (%s);",
            self::VERSIONS_TABLE,
            implode(',', [ $version['page_id'], $version['col'], $this->inQuotes($version['from']), $this->inQuotes($version['until'])])
        );
    }

    protected  function inQuotes(string $s) {
        return "'" . $s . "'";
    }
    protected function getTimeDiffInSeconds(string $t1, string $t2) {

        $dt1 = date_create_from_format(self::DB_TIME_FORMAT, $t1);
        $dt2 = date_create_from_format(self::DB_TIME_FORMAT, $t2);

        $tdiffsecs = $dt2->getTimestamp() - $dt1->getTimestamp();
        $tdiffsecs += (intval($dt2->format('u')) - intval($dt1->format('u')))/1000000.0;
        return $tdiffsecs;
    }
}