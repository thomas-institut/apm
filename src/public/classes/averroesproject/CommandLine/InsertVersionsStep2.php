<?php


namespace AverroesProject\CommandLine;

/**
 * Second step in properly entering versions in the database:
 *  - try to determine the version's author
 *  - check that the version is consistent
 * @package AverroesProject\CommandLine
 */

class InsertVersionsStep2 extends CommandLineUtility
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

        print "# Insert versions, step 2\n";
        print "# start time = " . date(self::TIME_FORMAT) . "\n";
        print "# Run insertversions first, fix all problems before changing the database\n";

        if ($argc === 3) {
            $pageCols= [
                ['page_id' => $argv[1], 'col' => $argv[2]]];
        } else {
            $pageCols = $dbh->getAllRows('SELECT DISTINCT page_id, col FROM ' . self::VERSIONS_TABLE);
        }


        print "# Processing " . count($pageCols) . " distinct columns with versions\n";

        foreach($pageCols as $pageCol) {
            $pageId = intval($pageCol['page_id']);
            $col = intval($pageCol['col']);

            $versions = $dbh->getAllRows(sprintf("SELECT * FROM %s WHERE page_id=%d AND col=%d", self::VERSIONS_TABLE, $pageId, $col ));

            print "# Processing page $pageId col $col, " . count($versions) . " versions\n";
            $minElementTime = $dbh->getSingleValue("SELECT min(valid_from) from ap_elements where page_id=$pageId and column_number=$col");
            for ($i = 0; $i < count($versions); $i++) {
                $version = $versions[$i];
                $versionId = $version['id'];
                $from = $version['time_from'];
                $until = $version['time_until'];

                $tdiff = $this->getTimeDiffInSeconds($from, $until);

                if ($tdiff < self::THRESHHOLD_DIFF) {
                    $this->printMsg($version, 'WARNING', "Version only lasts $tdiff seconds");
                }

                 $elements = $dbh->getAllRows("SELECT * from ap_elements where page_id=$pageId AND column_number=$col AND valid_from<='$from' AND valid_until>'$from'");

                 if ($from < $minElementTime) {
                     $this->printMsg($version, 'ERROR', 'Version start occurs before any element is defined');
                     print "DELETE FROM " . self::VERSIONS_TABLE . " WHERE id=$versionId;";
                     continue;
                 }

                if (count($elements) === 0) {
                    $this->printMsg($version, 'ERROR', 'No elements in version');
                    continue;

                }

                $elementIds = array_column($elements, 'id');
                $uniqueElementIds = array_unique($elementIds);
                if (count($elementIds) !== count($uniqueElementIds)) {
                    $this->printMsg($version, 'ERROR', 'Duplicate element Ids');
                }

                $items = $dbh->getAllRows("SELECT i.* from ap_elements as e, ap_items as i where i.ce_id=e.id " .
                    "AND e.page_id=$pageId AND e.column_number=$col AND i.valid_from<='$from' AND i.valid_until>'$from'" .
                    "AND e.valid_from<='$from' AND e.valid_until>'$from'");

                if (count ($items) === 0) {
                    $this->printMsg($version, 'WARNING', 'No items in version');
                }

                $itemIds = array_column($items, 'id');
                $uniqueItemIds = array_unique($itemIds);
                if (count($itemIds) !== count($uniqueItemIds)) {
                    $this->printMsg($version, 'ERROR', 'Duplicate item Ids');
                }

                $guessedVersionAuthor = $this->getElementAuthor($elements);
                if ($guessedVersionAuthor === 0) {
                    $this->printMsg($version, 'WARNING', 'Cannot guess author');
                } else {
                    $this->printMsg($version, 'AUTHOR', $guessedVersionAuthor);
                    $version['author_id'] = $guessedVersionAuthor;
                    $this->printUpdateAuthorSQL($version);
                }

            }

        }

    }

    protected function  printMsg(array $version, string $type, string $msg) {
        print "# $type, " . implode(', ', [$version['page_id'], $version['col'], $version['time_from']]) . ", $msg\n";
    }

    protected function getElementAuthor($elements) {

        $elementCountPerAuthor = [];
        foreach($elements as $element) {
            $authorId = $element['editor_id'];
            if (!isset($elementCountPerAuthor[$authorId])) {
                $elementCountPerAuthor[$authorId] = 0;
            }
            $elementCountPerAuthor[$authorId]++;
        }
        $theAuthor = 0;
        $maxCount = 0;
        foreach($elementCountPerAuthor as $authorId => $elementCount) {
            if ($elementCountPerAuthor[$authorId] > $maxCount) {
                $maxCount = $elementCountPerAuthor[$authorId];
                $theAuthor = $authorId;
            }
        }

        return $theAuthor;
    }

    protected  function printUpdateAuthorSQL($version) {
        print "UPDATE " . self::VERSIONS_TABLE . " SET author_id=" . $version['author_id'] . " WHERE id=" . $version['id'] . ";\n";
    }
    protected  function getInsertVersionSQL($version) {

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