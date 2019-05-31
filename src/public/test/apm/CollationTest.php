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

require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use APM\Core\Collation\CollationTable;
use APM\Core\Witness\StringWitness;
use APM\Core\Token\Token;


/**
 * Description of CollationTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CollationTest extends TestCase {
    
    private function prettyPrintCollation(CollationTable $c) : string {
        $out = "\n";
        foreach ($c->getSigla() as $siglum) {
            $tokens = $c->getWitnessTokens($siglum);
            $out .= $siglum . ': ';
            foreach($tokens as $t) {
                /* @var $t Token */
                if ($t->isEmpty()){
                    $out .= '¤';
                } else {
                    $out .= $t->getText();
                }
                $out .= "\t";
            }
            $out .= "\n";
        }
        return $out;
    }
    
    private function countNonWhiteSpaceTokens(array $tokens) {
        $count = 0;
        foreach ($tokens as $t) {
            if ($t->getType() !== Token::TOKEN_WHITESPACE) {
                $count++;
            }
        }
        return $count;
    }
    
    public function doSimpleCollationTests($collation) {
        
        $this->assertEquals(0, $collation->getTokenCount());
                
        $w1 = new StringWitness('tw', 'tchunk', 'This is witness one');
        $w2 = new StringWitness('tw', 'tchunk', 'This is witness two with more text');

        $w3 = new StringWitness('tw', 'tchunk', 'This witness three');
        $w4 = new Core\Witness\SimpleWitness('tw', 'tchunk', []);
        
        // Add witnesses
        $collation->addWitness('A', $w1);
        $this->assertEquals($this->countNonWhiteSpaceTokens($w1->getTokens()), $collation->getTokenCount());
        
        $collation->addWitness('B', $w2);
        $this->assertEquals($this->countNonWhiteSpaceTokens($w2->getTokens()), $collation->getTokenCount());
       
        $collation->addWitness('C', $w3);
        $expectedSize = $this->countNonWhiteSpaceTokens($w2->getTokens());
        $this->assertEquals($expectedSize, $collation->getTokenCount());
        
        $exceptionRaised = false;
        try {
            $collation->addWitness('D', $w4);
        } catch (\InvalidArgumentException $ex) {
            $exceptionRaised = true;
        }
        $this->assertTrue($exceptionRaised);
        
        // Get sigla
        $sigla = $collation->getSigla();
        $this->assertCount(3, $sigla);
        $this->assertContains('A', $sigla);
        $this->assertContains('B', $sigla);
        $this->assertContains('C', $sigla);
        
        // Get a column
        $column0 = $collation->getColumn(0);
        foreach($column0 as $token) {
            $this->assertEquals('This', $token->getText());
        }
        
        $exceptionRaised2 = false;
        try {
            $columnX = $collation->getColumn(1500);
        } catch (\InvalidArgumentException $ex) {
            $exceptionRaised2 = true;
        }
        $this->assertTrue($exceptionRaised2);
        
        // Get witness tokens
        $tokens = $collation->getWitnessTokens('B');
        $this->assertEquals($w2->getTokens(), $tokens);
        $tokens2 = $collation->getWitnessTokens('NonexistentSiglum');
        $this->assertEquals([], $tokens2);

        $expectedSize = $collation->getTokenCount();
        // Token shifting
        $collation->shiftToken('C', 1, 1);
        $this->assertEquals($expectedSize, $collation->getTokenCount());
        
        $collation->shiftToken('B', 3, 1);
        $expectedSize++;
        $this->assertEquals($expectedSize, $collation->getTokenCount());
        
        $collation->shiftToken('A', 3, 1);
        $this->assertEquals($expectedSize, $collation->getTokenCount());
        $collation->shiftToken('C', 3, 1);
        $this->assertEquals($expectedSize, $collation->getTokenCount());
        
        // Remove empty columns
        $collation->removeEmptyColumns();
        $expectedSize--;
        $this->assertEquals($expectedSize, $collation->getTokenCount());
        
        // Apparatus entry
        $this->assertEquals('', $collation->getApparatusEntryForColumn(0, 'This'));
        $this->assertEquals('is] C om. ', $collation->getApparatusEntryForColumn(1, 'is'));
        $this->assertEquals('one] B:two C:three ', $collation->getApparatusEntryForColumn(3, 'one'));
        $this->assertEquals('one+] B:+with ', $collation->getApparatusEntryForColumn(4, '', 'one+'));
    }
    
    public function testSimple() {
        
        $collation = new CollationTable();
        
        $this->doSimpleCollationTests($collation);
        
        $collation2 = new CollationTable(true);  // ignoring punctuation
        
        $this->doSimpleCollationTests($collation2);
        
    }
    
    public function testCollatexInputGeneration() {
        $collation = new CollationTable();
        
               
        $w1 = new StringWitness('tw', 'tchunk', 'This is witness one');
        $w2 = new StringWitness('tw', 'tchunk', 'This is witness two with more text');
        $w3 = new StringWitness('tw', 'tchunk', 'This witness three');
        $w4  = new Core\Witness\SimpleWitness('tw', 'tchunk', [ new Token(3, 'text', 'norm')]);
        
        // Add witnesses
        $collation->addWitness('A', $w1);
        $collation->addWitness('B', $w2);
        $collation->addWitness('C', $w3);
        $collation->addWitness('D', $w4);
        
        $collatexInput = $collation->getCollationEngineInput();
                
        $this->assertCount(4, $collatexInput);
        foreach($collatexInput as $collatexWitness) {
            $this->assertArrayHasKey('id', $collatexWitness);
            $this->assertArrayHasKey('tokens', $collatexWitness);
            foreach($collatexWitness['tokens'] as $collatexToken) {
                $this->assertArrayHasKey('t', $collatexToken);
                $this->assertArrayHasKey('witnessRef', $collatexToken);
                $this->assertNotEquals('', $collatexToken['t']);
            }
        }
    }
    
    public function testCollatexOutputProcessing(){
        $collation = new CollationTable();
        
               
        $w1 = new StringWitness('tw', 'tchunk', 'This is witness one');
        $w2 = new StringWitness('tw', 'tchunk', 'This is witness two');
        $w3 = new StringWitness('tw', 'tchunk', 'This is witness three');
        $w4  = new Core\Witness\SimpleWitness('tw', 'tchunk', [ 
            new Token(3, 'Ths', 'This'),
            new Token(1, 'is'),
            new Token(1, 'witness'),
            new Token(1, 'four')
            ]);
        
        // Add witnesses
        $collation->addWitness('A', $w1);
        $collation->addWitness('B', $w2);
        $collation->addWitness('C', $w3);
        $collation->addWitness('D', $w4);
        
        // Test bad collatex outputs
        $badCollatexOutputs = [ 
            [ 'reason' => 'Empty', 'theArray' => []],
            [ 'reason' => 'Missing witnesses', 'theArray' => [ 'table' => []]],
            [ 'reason' => 'Missing table', 'theArray' => [ 'witnesses' => []]],
            [ 'reason' => 'Not enough witnesses', 'theArray' => [
                'table' => [],
                'witnesses' => ['A', 'B']
                ]],
            [ 'reason' => 'Not all the witnesses', 'theArray' => [
                'table' => [],
                'witnesses' => ['A', 'B', 'C', 'C']
                ]],
            [ 'reason' => 'Extraneous witness', 'theArray' => [
                'table' => [],
                'witnesses' => ['A', 'B', 'C', 'E']
                ]],
            [ 'reason' => 'Bad number of witnesses in segment', 'theArray' => [
                'table' => [ [ [],[],[]]],  // only 3 elements in segment
                'witnesses' => ['A', 'B', 'C', 'D']
                ]],
            [ 'reason' => 'Not witnessRef in segment', 'theArray' => [
                'table' => [ [ ['t' => 'test'],['t' => 'test'],['t' => 'test'], ['t' => 'test']] ],  
                'witnesses' => ['A', 'B', 'C', 'D']
                ]]
        ];
        foreach($badCollatexOutputs as $testCase) {
            $exceptionRaised = false;
            try {
                $collation->setCollationTableFromCollationEngineOutput($testCase['theArray']);
            } catch (\InvalidArgumentException $ex) {
                $exceptionRaised = true;
            }
            $this->assertTrue($exceptionRaised, $testCase['reason']);
        }
        
        // Simple, aligned collatexOutput  (not really the "right" collation for
        // the given witnesses!
        $goodCollatexOutput = [
            'witnesses' => ['A', 'B', 'C', 'D'],
            'table' => [
                [
                    [ 
                        [ 't' => 'This', 'witnessRef' =>0], 
                        [ 't' => 'is', 'witnessRef' => 1], 
                        [ 't' => 'witness', 'witnessRef' => 2],
                        [ 't' => 'one', 'witnessRef' => 3]
                    ],
                    [ 
                        [ 't' => 'This', 'witnessRef' =>0], 
                        [ 't' => 'is', 'witnessRef' => 1], 
                        [ 't' => 'witness', 'witnessRef' => 2],
                        [ 't' => 'two', 'witnessRef' => 3]
                    ],
                    [ 
                        [ 't' => 'This', 'witnessRef' =>0], 
                        [ 't' => 'is', 'witnessRef' => 1], 
                        [ 't' => 'witness', 'witnessRef' => 2],
                        [ 't' => 'three', 'witnessRef' => 3]
                    ],
                    [ 
                         [ 't' => 'This', 'witnessRef' =>0], 
                        [ 't' => 'is', 'witnessRef' => 1], 
                        [ 't' => 'witness', 'witnessRef' => 2],
                        [ 't' => 'four', 'witnessRef' => 3]
                    ]
                ]
               
            ]
        ];
        $collation->setCollationTableFromCollationEngineOutput($goodCollatexOutput);
        
        $this->assertEquals(4, $collation->getTokenCount());
        $collationTable = $collation->getCollationTable();
        $tokenClassName = get_class(Token::emptyToken());
        foreach ($collationTable as $tokens) {
            $this->assertCount(4, $tokens);
            foreach($tokens as $token) {
                $this->assertTrue(is_a($token, $tokenClassName));
            }
        }
        
    }
    
    public function testSegmentPadding() {
        $collation = new CollationTable();
        
               
        $w1 = new StringWitness('tw', 'tchunk', 'This is witness one');
        $w2 = new StringWitness('tw', 'tchunk', 'This is witness two');
        $w3 = new StringWitness('tw', 'tchunk', 'This is witnes three');
        // Add witnesses
        $collation->addWitness('A', $w1);
        $collation->addWitness('B', $w2);
        $collation->addWitness('C', $w3);
        
        
        $segment1 = [ 
            [ 
                [ 't' => 'This', 'witnessRef' => 0],
                [ 't' => 'is', 'witnessRef' => 1],
                [ 't' => 'witness', 'witnessRef' => 2]
            ],
            [ 
                [ 't' => 'This', 'witnessRef' => 0],
                [ 't' => 'is', 'witnessRef' => 1],
                [ 't' => 'witness', 'witnessRef' => 2],
                [ 't' => 'two', 'witnessRef' => 3]
            ],
            [ 
                [ 't' => 'This', 'witnessRef' => 0],
                [ 't' => 'is', 'witnessRef' => 1],
            ]
        ];
        $collation->setCollationTableFromCollationEngineOutput(['witnesses' => ['A', 'B', 'C'], 'table'=> [ $segment1]]);
        $this->assertEquals(4, $collation->getTokenCount());
        foreach ($collation->getSigla() as $siglum) {
            $this->assertCount(4, $collation->getReferencesForRow($siglum), $siglum);
            $this->assertCount(4, $collation->getRow($siglum), $siglum);
        }
        
        $table = $collation->getCollationTable();
        foreach($table as $siglum => $tokens) {
            $this->assertCount(4, $tokens);
        }
        
    }
    
    public function testGetVariantTable() {
        $collation = new CollationTable();
        
           
        // Simple case, no empty tokens
        $w1 = new StringWitness('tw', 'tchunk', 'This is witness one');
        $w2 = new StringWitness('tw', 'tchunk', 'This is witness two');
        $w3 = new StringWitness('tw', 'tchunk', 'This is witnes three');
        // Add witnesses
        $collation->addWitness('A', $w1);
        $collation->addWitness('B', $w2);
        $collation->addWitness('C', $w3);
        
        $variantTable = $collation->getVariantTable();
        $this->assertCount(3, $variantTable);
        $this->assertEquals([0,0,0,0], $variantTable['A']);
        $this->assertEquals([0,0,0,1], $variantTable['B']);
        $this->assertEquals([0,0,1,2], $variantTable['C']);
        
        // Same, but with witnesses added in different order
        $c2 = new CollationTable();
        $c2->addWitness('C', $w3);
        $c2->addWitness('B', $w2);
        $c2->addWitness('A', $w1);
        $vt2 = $c2->getVariantTable();
        $this->assertCount(3, $vt2);
        $this->assertEquals([0,0,0,2], $vt2['A']);
        $this->assertEquals([0,0,0,1], $vt2['B']);
        $this->assertEquals([0,0,1,0], $vt2['C']);
        
        // adding another witness with extra tokens
        $w4 = new StringWitness('tw', 'tchunk', 'This is witness four with extra tokens');
        $c2->addWitness('D', $w4);
        $vt3 = $c2->getVariantTable();
        $this->assertCount(4, $vt3);
        $this->assertEquals([0,0,0,2,-1,-1,-1], $vt3['A']);
        $this->assertEquals([0,0,0,1,-1,-1,-1], $vt3['B']);
        $this->assertEquals([0,0,1,0,-1,-1,-1], $vt3['C']);
        $this->assertEquals([0,0,0,3,0,0,0], $vt3['D']);
        
    }
    
    public function testCollatexProcessing() {
        
        $testCases = [
            [  // TEST CASE 1
                'title' => 'Two texts different size' , 
                'witnesses' => [ 'A' => 'This is some text', 'B' =>  'This is some text with more text'],
                'collatexOutput' => json_decode($this->getTestCase1JSON(), true),
                'expectedSize' => 7
            ]
        ];
        
        
        foreach($testCases as $testCase) {
            $collation = new CollationTable();
            foreach($testCase['witnesses'] as $siglum => $text) {
                $collation->addWitness($siglum, new StringWitness('tw', 'tc', $text));
            }
            $collation->setCollationTableFromCollationEngineOutput($testCase['collatexOutput']);
            $collationTable = $collation->getCollationTable();
            foreach($collationTable as $siglum => $tokens) {
                $id = $testCase['title'] .  ' witness ' . $siglum;
                $this->assertCount($testCase['expectedSize'], $collation->getReferencesForRow($siglum), $id);
                $this->assertCount($testCase['expectedSize'], $tokens, $id );
            }
        }
    }
    
    private function getTestCase1JSON() {
        return <<<EOT
{
    "witnesses": [
      "A",
      "B"
    ],
    "table": [
      [
        [
          {
            "witnessRef": 0,
            "t": "This"
          },
          {
            "witnessRef": 1,
            "t": "is"
          },
          {
            "witnessRef": 2,
            "t": "some"
          },
          {
            "witnessRef": 3,
            "t": "text"
          }
        ],
        [
          {
            "witnessRef": 0,
            "t": "this"
          },
          {
            "witnessRef": 1,
            "t": "is"
          },
          {
            "witnessRef": 2,
            "t": "some"
          },
          {
            "witnessRef": 3,
            "t": "text"
          }
        ]
      ],
      [
        [],
        [
          {
            "witnessRef": 4,
            "t": "with"
          },
          {
            "witnessRef": 5,
            "t": "more"
          },
          {
            "witnessRef": 6,
            "t": "text"
          }
        ]
      ]
    ]
  }
EOT;
    }
    
}
