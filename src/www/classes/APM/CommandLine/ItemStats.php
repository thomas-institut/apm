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
use IntlChar;
use ThomasInstitut\TimeString\TimeString;
use ThomasInstitut\ToolBox\MySqlHelper;

class ItemStats extends CommandLineUtility
{

    /**
     * @var MySqlHelper
     */
    private MySqlHelper $dbHelper;

    /**
     * @var string
     */
    private string $itemsTableName;


    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->dbHelper = new MySqlHelper($this->getDbConn(), $this->logger);
        $this->itemsTableName = $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_ITEMS];
    }

    public function main($argc, $argv)
    {

        $doCharMap = false;
        $doWordMap = false;
        if (isset($argv[1]) && $argv[1] === 'charmap') {
            $doCharMap = true;
        }

        if (isset($argv[1])) {
            switch ($argv[1]) {
                case 'charmap':
                    $doCharMap = true;
                    break;

                case 'words':
                    $doWordMap = true;
                    break;
            }
        }

        if ($doCharMap) {
            print "Doing system charmap, this may take some time...\n";
        }

        if ($doWordMap) {
            print "Analyzing words, this may take some time....\n";
        }
        $charMap = [];
        $query = 'SELECT * FROM ' . $this->itemsTableName;

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

        $perLang = [];

        $words = [  ];
        $n = 0;
        while ($item = $r->fetch(\PDO::FETCH_ASSOC)) {
            $n++;
            if ($n % 500 === 0) {
                if ($doWordMap) {
                    $msg = "Processing $n, ";
                    foreach ($words as $lang => $wordArray) {
                        $msg .= "$lang: " . count($wordArray) . "   ";
                    }
                    print "$msg\r";
                } else {
                    print "Processing $n\r";
                }

            }
            $stats['count']++;
            $itemLang = $item['lang'];
            if (!isset($perLang[$itemLang])) {
                $perLang[$itemLang] = [
                    'count' => 0,
                    'current' => 0
                    ];

                $words[$itemLang] = [];
            }
            $perLang[$itemLang]['count']++;
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
                $perLang[$itemLang]['current']++;
                if ($doCharMap) {
                    for ($i = 0; $i < $textLengthMb; $i++) {
                        $char = mb_substr($item['text'], $i, 1);
                        $unicodePoint = IntlChar::ord($char);
                        if (!isset($charMap[$unicodePoint])) {
                            $charMap[$unicodePoint] = 0;
                        }
                        $charMap[$unicodePoint]++;
                    }
                }

                if ($doWordMap) {
                    $itemWords = explode(' ', $item['text']);
                    foreach ($itemWords as $word) {
                        $this->accumulateWord($words[$itemLang], $word);
                    }
                }
            }

            if (StringFilter::removeBOMs($item['text']) !== $item['text']) {
                $stats['withBOMs']++;
            }


        }


        $stats['averageTextLength'] = round($stats['totalLength']/ $stats['withText'], 1) . ' characters';
        $stats['mbstringsPerc'] = round($stats['mbstrings']*100 / $stats['withText'], 1) . '%';

        if ($doWordMap) {
            foreach ($words as $lang => $wordArray) {
                $perLang[$lang]['uniqueWordCount']= count($wordArray);
            }
        }
        $stats['totalLength'] = $stats['totalLength'] . ' (' . round($stats['totalLength']/1024/1024, 1) . ' MB)';
        foreach($stats as $key => $value) {
            print "$key: $value\n";
        }

        print "Per language: \n";

        foreach ($perLang as $lang => $langStats) {
            print "  $lang: \n";
            foreach($langStats as $key => $value) {
                print "    $key: $value\n";
            }
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

    private function accumulateWord(array &$wordArray, string $word) : void {

        if (!in_array($word, $wordArray)) {
            $wordArray[] = $word;
        }
//        $wordFound = false;
//
//        for($i = 0; $i< count($wordArray); $i++) {
//            $wordDataItem = $wordArray[$i];
//            if ($wordDataItem['word'] === $word) {
//                $wordDataItem['count']++;
//                $wordFound = true;
//                break;
//            }
//        }
//        if (!$wordFound) {
//            $wordArray[] = [ 'word' => $word, 'count' => 1];
//        }
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