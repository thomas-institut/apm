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

namespace Test\APM\Core\Witness;

use APM\Core\Token\TokenType;
use APM\FullTranscription\ApmTranscriptionWitness;
use AverroesProjectToApm\DatabaseItemStream;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\TimeString\TimeString;

class TranscriptionWitnessTest extends TestCase
{

    public function testLineElementsInARow()
    {
        $txWitness = $this->getTxWitness('testcase01.csv', false);

        $tokens = $txWitness->getTokens();

        $this->assertCount(3, $tokens);
        $this->assertEquals('FirstLine',$tokens[0]->getText());
        $this->assertEquals(TokenType::WHITESPACE, $tokens[1]->getType());
        $this->assertEquals('SecondLine',$tokens[2]->getText());

    }

    // NOTE: this case cannot be tested at the transcription witness level
    // because it is the ApmTranscriptionManager that filters out non-targeted additions
    // from the database rows
//    public function testLinesWithAdditionInBetween() {
//        $txWitness = $this->getTxWitness('testcase02.csv', true);
//
//        $expectedTokens = [
//            ['type' => TokenType::WORD, 'text' => 'Element1'],
//            ['type' => TokenType::PUNCTUATION, 'text' => "\n"],
//            ['type' => TokenType::WORD, 'text' => 'Element2']
//        ];
//        $tokens = $txWitness->getTokens();
//        $this->assertCount(count($expectedTokens), $tokens);
//
//    }

    public function getTxWitness(string $csvFileName, $debugMode = false) {
        $inputRows = $this->readItemStreamRowCsv(__DIR__ . '/' . $csvFileName);
        $databaseItemStream = new DatabaseItemStream(1, [ $inputRows], 'la', [], $debugMode);
        $witness = new ApmTranscriptionWitness(1, 'AW47', 1, 'A', TimeString::now(), $databaseItemStream );
        $witness->setDebugMode($debugMode);
        return $witness;
    }

    public function readItemStreamRowCsv(string $fileName): array {
        $handle = fopen($fileName, 'r');
        $lines = [];
        if (!$handle) {
            throw new \RuntimeException("Can't open file $fileName");
        }

        while (($line = fgets($handle)) !== false) {
            $lines[] = $line;
        }
        fclose($handle);

        $fieldsToRead = [ 'id','seq','ce_id','e.seq','col','page_id','p.seq','foliation',
            'type','text','lang','alt_text','extra_info','length','target','hand','e.type','placement'];

        $rows = [];
        foreach($lines as $line) {
            if (preg_match('/^#/', $line)){
                continue;
            }
            $line = rtrim($line);  // strip newlines and ws from the end
            $fields = explode(',', $line);

            $row = [];
            foreach($fieldsToRead as $i => $fieldName) {
                if (isset($fields[$i])) {
                    $row[$fieldName] = $fields[$i];
                } else {
                    $row[$fieldName] = '';
                }
            }
            $rows[] = $row;

        }
        return $rows;
    }
}
