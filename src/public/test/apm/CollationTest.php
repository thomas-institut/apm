<?php

/*
 * Copyright (C) 2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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
    
    public function testSimple() {
        
        $collation = new CollationTable();
        
        $this->assertEquals(0, $collation->getTokenCount());
                
        $w1 = new StringWitness('tw', 'tchunk', 'This is witness one');
        $w2 = new StringWitness('tw', 'tchunk', 'This is witness two with more text');
        $w3 = new StringWitness('tw', 'tchunk', 'This witness three');
        $w4 = new Core\Witness\SimpleWitness('tw', 'tchunk', []);
        
        // Add witnesses
        $collation->addWitness('A', $w1);
        $this->assertEquals(count($w1->getTokens()), $collation->getTokenCount());
        
        $collation->addWitness('B', $w2);
        $this->assertEquals(count($w2->getTokens()), $collation->getTokenCount());
       
        $collation->addWitness('C', $w3);
        $expectedSize = count($w2->getTokens());
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
            $this->assertCount(4, $collation->getWitnessCollationRawTokens($siglum), $siglum);
            $this->assertCount(4, $collation->getWitnessCollationTokens($siglum), $siglum);
        }
        
        $table = $collation->getCollationTable();
        foreach($table as $siglum => $tokens) {
            $this->assertCount(4, $tokens);
        }
        
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
                $this->assertCount($testCase['expectedSize'], $collation->getWitnessCollationRawTokens($siglum), $id);
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
