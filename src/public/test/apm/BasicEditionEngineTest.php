<?php

/*
 *  Copyright (C) 2019 Universität zu Köln
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

namespace APM;

use APM\Core\Token\StringTokenizer;
use APM\Core\Token\Token;
use APM\Core\Witness\StringWitness;
use APM\EditionEngine\EditionEngine;
use PHPUnit\Framework\TestCase;
use APM\EditionEngine\BasicEditionEngine;

require "../vendor/autoload.php";

/**
 * Tests for the BasicEditionEngine
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class BasicEditionEngineTest extends TestCase
{

    public function testBadInput() {

        $engine = new BasicEditionEngine();
        // empty input
        $engineInput1 = [];
        $this->assertEquals([],$engine->generateEdition($engineInput1));
        $this->assertEquals(EditionEngine::ERROR_BAD_INPUT, $engine->getErrorCode());
        $this->assertNotEquals('', $engine->getErrorMessage());

        // bad tokens
        $engineInput2 = [
            EditionEngine::INPUT_FIELD_LANGUAGE => 'la',
            EditionEngine::INPUT_FIELD_TEXT_DIRECTION => 'ltr',
            EditionEngine::INPUT_FIELD_BASE_SIGLUM => 'A',
            EditionEngine::INPUT_FIELD_SIGLA_ABBREVIATIONS => [ 'A' => 'A', 'B' => 'B'],
            EditionEngine::INPUT_FIELD_COLLATION_TABLE => [
                'A' => [ [], []]
                ]
        ];
        $this->assertEquals([],$engine->generateEdition($engineInput2));
        $this->assertEquals(EditionEngine::ERROR_BAD_INPUT, $engine->getErrorCode());
        $this->assertNotEquals('', $engine->getErrorMessage());

    }

    public function testMainTextGenerator() {
        $mainText = 'This is some --- main text, with --- punctuation and gaps!';

        $expectedMainTextTokens = [
            'This', 'GLUE',
            'is', 'GLUE',
            'some', 'GLUE',
            'main', 'GLUE',
            'text', ',', 'GLUE',
            'with', 'GLUE',
            'punctuation', 'GLUE',
            'and', 'GLUE',
            'gaps', '!'
        ];

        $engine = new BasicEditionEngine();
        list ($mainTextTokens, $tokenMap) = $engine->generateMainText($this->getEngineTokensFromString($mainText,  false, true));
        //print_r($mainTextTokens);

        foreach($expectedMainTextTokens as $i => $token) {
            //print "Testing token " . $i . "\n";
            //print_r($mainTextTokens[$i]);
            if ($token === 'GLUE') {
                $this->assertEquals(EditionEngine::E_TOKEN_TYPE_GLUE, $mainTextTokens[$i][EditionEngine::E_TOKEN_FIELD_TYPE]);
                continue;
            }
            $this->assertEquals(EditionEngine::E_TOKEN_TYPE_TEXT, $mainTextTokens[$i][EditionEngine::E_TOKEN_FIELD_TYPE]);
            $this->assertEquals($token, $mainTextTokens[$i][EditionEngine::E_TOKEN_FIELD_TEXT]);
        }
    }

    public function testSimple() {

        $engine = new BasicEditionEngine();

        $w1 = 'This is a test';
        $w2 = 'That is a test';

        $engineInput = [
            EditionEngine::INPUT_FIELD_LANGUAGE => 'la',
            EditionEngine::INPUT_FIELD_SIGLA_ABBREVIATIONS => [ 'W1' => 'A', 'W2' => 'B'],
            EditionEngine::INPUT_FIELD_BASE_SIGLUM => 'W1',
            EditionEngine::INPUT_FIELD_TEXT_DIRECTION => EditionEngine::TEXT_DIRECTION_LTR,
            EditionEngine::INPUT_FIELD_COLLATION_TABLE => [
                'W1' => $this->getEngineTokensFromString($w1),
                'W2' => $this->getEngineTokensFromString($w2)
            ]
        ];
        $expectedApparatusEntry = [
            EditionEngine::APPARATUS_ENTRY_FIELD_TYPE => EditionEngine::APPARATUS_ENTRY_TYPE_VARIANT,
            EditionEngine::APPARATUS_ENTRY_FIELD_TEXT => 'That',
            EditionEngine::APPARATUS_ENTRY_FIELD_START => 0,
            EditionEngine::APPARATUS_ENTRY_FIELD_END => 0,
            EditionEngine::APPARATUS_ENTRY_FIELD_SIGLA => [ 'W2']
            ];

        $edition = $engine->generateEdition($engineInput);
        $this->assertNotEquals([], $edition);
        $this->assertCount(1,$edition[EditionEngine::EDITION_FIELD_APPARATUS_ARRAY][0]);
        foreach ($expectedApparatusEntry as $key => $value) {
            $this->assertEquals($value, $edition[EditionEngine::EDITION_FIELD_APPARATUS_ARRAY][0][0][$key]);
        }
    }

    public  function testSimple2() {
        $engine = new BasicEditionEngine();

        $w1 = 'This is a ---';
        $w2 = 'This --- a test';
        $w3 = 'This is a ---';

        $engineInput = [
            EditionEngine::INPUT_FIELD_LANGUAGE => 'la',
            EditionEngine::INPUT_FIELD_SIGLA_ABBREVIATIONS => [ 'W1' => 'A', 'W2' => 'B', 'W3' => 'C'],
            EditionEngine::INPUT_FIELD_BASE_SIGLUM => 'W1',
            EditionEngine::INPUT_FIELD_TEXT_DIRECTION => EditionEngine::TEXT_DIRECTION_LTR,
            EditionEngine::INPUT_FIELD_COLLATION_TABLE => [
                'W1' => $this->getEngineTokensFromString($w1, true, true),
                'W2' => $this->getEngineTokensFromString($w2, true, true),
                'W3' => $this->getEngineTokensFromString($w3, true, true)
            ]
        ];
        $expectedApparatusEntry0 = [
            EditionEngine::APPARATUS_ENTRY_FIELD_TYPE => EditionEngine::APPARATUS_ENTRY_TYPE_OMMISION,
            //EditionEngine::APPARATUS_ENTRY_FIELD_TEXT => '',
            EditionEngine::APPARATUS_ENTRY_FIELD_START => 2,  // 0 = This, 1 = glue, 2 = 'is'
            EditionEngine::APPARATUS_ENTRY_FIELD_END => 2,
            EditionEngine::APPARATUS_ENTRY_FIELD_SIGLA => [ 'W2']
        ];

        $expectedApparatusEntry1 = [
            EditionEngine::APPARATUS_ENTRY_FIELD_TYPE => EditionEngine::APPARATUS_ENTRY_TYPE_ADDITION,
            EditionEngine::APPARATUS_ENTRY_FIELD_TEXT => 'test',
            EditionEngine::APPARATUS_ENTRY_FIELD_START => 4,  // 3 = glue
            EditionEngine::APPARATUS_ENTRY_FIELD_END => 4,
            EditionEngine::APPARATUS_ENTRY_FIELD_SIGLA => [ 'W2']
        ];

        $edition = $engine->generateEdition($engineInput);
        $this->assertNotEquals([], $edition);
        $this->assertCount(2,$edition[EditionEngine::EDITION_FIELD_APPARATUS_ARRAY][0]);
        foreach ($expectedApparatusEntry0 as $key => $value) {
            $this->assertEquals($value, $edition[EditionEngine::EDITION_FIELD_APPARATUS_ARRAY][0][0][$key]);
        }
        foreach ($expectedApparatusEntry1 as $key => $value) {
            $this->assertEquals($value, $edition[EditionEngine::EDITION_FIELD_APPARATUS_ARRAY][0][1][$key]);
        }
    }


    public function testSimple3() {

        $engine = new BasicEditionEngine();

        $w1 = '--- this is a test';
        $w2 = 'And this is a test';

        $engineInput = [
            EditionEngine::INPUT_FIELD_LANGUAGE => 'la',
            EditionEngine::INPUT_FIELD_SIGLA_ABBREVIATIONS => [ 'W1' => 'A', 'W2' => 'B'],
            EditionEngine::INPUT_FIELD_BASE_SIGLUM => 'W1',
            EditionEngine::INPUT_FIELD_TEXT_DIRECTION => EditionEngine::TEXT_DIRECTION_LTR,
            EditionEngine::INPUT_FIELD_COLLATION_TABLE => [
                'W1' => $this->getEngineTokensFromString($w1, true, true),
                'W2' => $this->getEngineTokensFromString($w2, true, true)
            ]
        ];
        $expectedApparatusEntry = [
            EditionEngine::APPARATUS_ENTRY_FIELD_TYPE => EditionEngine::APPARATUS_ENTRY_TYPE_ADDITION,
            EditionEngine::APPARATUS_ENTRY_FIELD_TEXT => 'And',
            EditionEngine::APPARATUS_ENTRY_FIELD_START => BasicEditionEngine::INDEX_BEFORE_MAIN_TEXT,
            EditionEngine::APPARATUS_ENTRY_FIELD_END => BasicEditionEngine::INDEX_BEFORE_MAIN_TEXT,
            EditionEngine::APPARATUS_ENTRY_FIELD_SIGLA => [ 'W2']
        ];

        $edition = $engine->generateEdition($engineInput);
        $this->assertNotEquals([], $edition);
        $this->assertCount(1,$edition[EditionEngine::EDITION_FIELD_APPARATUS_ARRAY][0]);
        foreach ($expectedApparatusEntry as $key => $value) {
            $this->assertEquals($value, $edition[EditionEngine::EDITION_FIELD_APPARATUS_ARRAY][0][0][$key]);
        }
    }

    protected function stringTokensToEngineTokens(array $stringTokens, $ignoreWhiteSpace = true, $useGaps = false) : array  {
        $engineTokens = [];
        foreach($stringTokens as $t) {
            if ($ignoreWhiteSpace && ($t->getType() === Token::TOKEN_WHITESPACE)) {
                continue;
            }
            if ($useGaps && $t->getText() === '---'){
                $engineTokens[] = [
                    EditionEngine::TOKEN_FIELD_TYPE => Token::TOKEN_EMPTY,
                    EditionEngine::TOKEN_FIELD_TEXT => ''
                ];
                continue;
            }
            $engineTokens[] = [
                EditionEngine::TOKEN_FIELD_TYPE => $t->getType(),
                EditionEngine::TOKEN_FIELD_TEXT => $t->getNormalization()
            ];
        }
        return $engineTokens;
    }

    protected function getEngineTokensFromString(string $text, $ignoreWhitespace = true, $useGaps = false) : array  {
        $stringTokens = StringTokenizer::getTokensFromString($text);
        return $this->stringTokensToEngineTokens($stringTokens, $ignoreWhitespace, $useGaps);
    }




}