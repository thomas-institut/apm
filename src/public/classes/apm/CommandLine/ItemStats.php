<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace APM\CommandLine;


use APM\System\ApmMySqlTableName;
use APM\ToolBox\StringFilter;
use AverroesProject\Data\MySqlHelper;
use IntlChar;
use ThomasInstitut\TimeString\TimeString;

class ItemStats extends CommandLineUtility
{

    /**
     * @var MySqlHelper
     */
    private $dbHelper;

    /**
     * @var string
     */
    private $ti;


    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->dbHelper = new MySqlHelper($this->dbConn, $this->logger);
        $this->ti = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_ITEMS];
    }

    protected function main($argc, $argv)
    {

        $doCharMap = false;
        if (isset($argv[1]) && $argv[1] === 'charmap') {
            $doCharMap = true;
        }

        if ($doCharMap) {
            print "Doing system charmap, this may take some time...\n";
        }
        $charMap = [];
        $query = 'SELECT * FROM ' . $this->ti;

        $r = $this->dbHelper->query($query);
        if ($r === false) {
            return false;
        }
        $stats = [
            'count' => 0,
            'withText' => 0,
            'totalLength' => 0,
            'current' => 0,
            'mbstrings' => 0,
            'longest' => 0,
            'withBOMs' => 0
        ];
        $n = 0;
        while ($item = $r->fetch(\PDO::FETCH_ASSOC)) {

            $stats['count']++;
            if (is_null($item['text'])) {
                continue;
            }
            $stats['withText']++;
            $textLength = strlen($item['text']);
            $textLengthMb = mb_strlen($item['text']);
            $stats['totalLength'] += $textLengthMb;
            if ($textLength !== $textLengthMb) {
                $stats['mbstrings']++;
            }
            if ($textLengthMb > $stats['longest']) {
                $stats['longest'] = $textLengthMb;
            }
            if ($item['valid_until'] === TimeString::END_OF_TIMES) {
                $stats['current']++;
                if ($doCharMap) {
                    $n++;
                    if ($n % 10000 === 0) {
                        print "Processing $n\r";
                    }
                    for ($i = 0; $i < $textLengthMb; $i++) {
                        $char = mb_substr($item['text'], $i, 1);
                        $unicodePoint = IntlChar::ord($char);
                        if (!isset($charMap[$unicodePoint])) {
                            $charMap[$unicodePoint] = 0;
                        }
                        $charMap[$unicodePoint]++;
                    }
                }
            }

            if (StringFilter::removeBOMs($item['text']) !== $item['text']) {
                $stats['withBOMs']++;
            }


        }


        $stats['averageTextLength'] = round($stats['totalLength']/ $stats['withText'], 1) . ' characters';
        $stats['mbstringsPerc'] = round($stats['mbstrings']*100 / $stats['withText'], 1) . '%';

        $stats['totalLength'] = $stats['totalLength'] . ' (' . round($stats['totalLength']/1024/1024, 1) . ' MB)';
        foreach($stats as $key => $value) {
            print "$key: $value\n";
        }


        if ($doCharMap) {
            print "\nCharacter Map\n";
            print count($charMap) . " different characters in $n current items with text\n";
            $unicodePoints = array_keys($charMap);
            sort($unicodePoints);



            foreach($unicodePoints as $unicodePoint) {
                print $this->getUnicodePointString($unicodePoint) . "\t" . $charMap[$unicodePoint] . "\n";
            }

        }



    }

    private function getUnicodePointString(int $unicodePoint) : string {
      return $this->getUnicodePointStringRep($unicodePoint) . ' (' . $this->getCharRepr($unicodePoint) . ')';
    }

    private function getUnicodePointStringRep(int $unicodePoint): string {
        $hex = sprintf("U+%4s", dechex($unicodePoint));
        return str_replace(' ', '0', $hex);
    }

    private function getCharRepr(int $unicodePoint) : string {
        switch ($unicodePoint) {
            case 9:
                return 'TAB';

            case 10:
                return 'LF';

            case 14:
                return 'ShiftOut';

            case 160:
                return 'NoBreakSpace';
            default:
                return "'" . IntlChar::chr($unicodePoint) . "'";
        }
    }

    private function getItemCount(string $ti) {
        $query = "SELECT count(*) as c from $ti";

        return intval($this->dbHelper->getOneFieldQuery($query, 'c'));

    }
}