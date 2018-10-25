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
use APM\Core\Collation\Collation;
use APM\Core\Witness\StringWitness;
use APM\Core\Token\Token;


/**
 * Description of CollationTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CollationTest extends TestCase {
    
    private function prettyPrintCollation(Collation $c) : string {
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
        
        $collation = new Collation();
        
        $this->assertEquals(0, $collation->getTokenCount());
                
        $w1 = new StringWitness('tw', 'tchunk', 'This is witness one');
        $w2 = new StringWitness('tw', 'tchunk', 'This is witness two with more text');
        $w3 = new StringWitness('tw', 'tchunk', 'This witness three');
        
        // Add witnesses
        $collation->addWitness('A', $w1->getTokens());
        $this->assertEquals(count($w1->getTokens()), $collation->getTokenCount());
        
        $collation->addWitness('B', $w2->getTokens());
        $this->assertEquals(count($w2->getTokens()), $collation->getTokenCount());
       
        $collation->addWitness('C', $w3->getTokens());
        $expectedSize = count($w2->getTokens());
        $this->assertEquals($expectedSize, $collation->getTokenCount());
        
        $exceptionRaised = false;
        try {
            $collation->addWitness('D', []);
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
    
}
