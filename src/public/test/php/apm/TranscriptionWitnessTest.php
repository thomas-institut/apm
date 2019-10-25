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

require "autoload.php";

use PHPUnit\Framework\TestCase;
use APM\Core\Transcription\DocumentTranscriptionBasic;
use APM\Core\Transcription\PageTranscriptionFactory;
use APM\Core\Transcription\ItemAddressInDocument;
use APM\Core\Witness\SimpleTranscriptionWitness;
use APM\Core\Token\TranscriptionToken;
use APM\Core\Token\Token;
use APM\Core\Item\TextualItem;
use APM\Core\Item\Mark;

/**
 * TranscritionWitness class test
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TranscriptionWitnessTest extends TestCase {
    
    public function testSimpleTranscription() {
        $dt = new DocumentTranscriptionBasic();
        
        $emptyTranscriptionWitness = new SimpleTranscriptionWitness('test', 'test', $dt);
        $this->assertEquals([], $emptyTranscriptionWitness->getTokens());
        
        $ptf = new PageTranscriptionFactory();
        $pageText = "This is a simple test of a \npage with two lines";
        $numTokensInPageText = 21;
        $numPages = 2;
        $startPage = 50;
        for ($i = 0; $i<$numPages; $i++) {
            $dt->setPageTranscription(
                $i+$startPage, 
                $ptf->createPageTranscriptionFromColumnTextArray(
                    'la',
                    0, 
                    [[$pageText]]
                )
            );
        }
        $dtw = new SimpleTranscriptionWitness('Test Work', 'Test Chunk', $dt);
        
        $tokens = $dtw->getTokens();
        
        $this->assertCount($numTokensInPageText * $numPages, $tokens);
        
        foreach($tokens as $i => $token) {
            /* @var $token TranscriptionToken */
            $this->assertCount(1, $token->getSourceItemAddresses());
            $this->assertCount(1, $token->getSourceItemIndexes());
            $itemIndex = $token->getSourceItemIndexes()[0];
            $this->assertEquals(floor($i/$numTokensInPageText), $itemIndex);
            $itemAdress = $token->getSourceItemAddresses()[0];
            /* @var $itemAddress ItemAddressInDocument */
            $this->assertEquals($startPage + floor($i/$numTokensInPageText),
                    $itemAdress->getPageId()
                    );
        }
    }
    
    public function testLineNumbers() {
        $ptf = new PageTranscriptionFactory();
        $dt = new DocumentTranscriptionBasic();
        
        $linesPerColumn = 3;
        $columnsPerPage = 2;
        $columnText = '';
        for ($i = 0; $i < $linesPerColumn; $i++) {
            $columnText .= 'Line' . $i . "\n";
        }
        $columns = [];
        for ($i=0; $i < $columnsPerPage; $i++) {
            $columns[] = [$columnText];
        }
        $dt->setPageTranscription(
            1, 
            $ptf->createPageTranscriptionFromColumnTextArray(
                'la',
                0, 
                $columns
            )
        );
        
        $dtw = new SimpleTranscriptionWitness('Test Work', 'Test Chunk', $dt);
        
        $tokens = $dtw->getTokens();
        $this->assertCount(2*$columnsPerPage*$linesPerColumn, $tokens);
        $n = 0;
        foreach($tokens as $token) {
            if ($n % 2) {
                $this->assertEquals($token->getType(), Token::TOKEN_WHITESPACE);
            } else {
                $this->assertEquals($token->getType(), Token::TOKEN_WORD);
            }
            $n++;
        }
    }
    
    public function testMultiItemTokens() {
        $ptf = new PageTranscriptionFactory();
        $dt = new DocumentTranscriptionBasic();
        $dt->setPageTranscription(
            1, 
            $ptf->createPageTranscriptionFromColumnTextArray(
                'la',
                0, 
                [ ['some', 'text', '.', 'more', 'text andmore']]
            )
        );
        
        $dtw = new SimpleTranscriptionWitness('Test Work', 'Test Chunk', $dt);
        
        $tokens = $dtw->getTokens();
        
        $this->assertCount(5, $tokens);
        $this->assertEquals('sometext', $tokens[0]->getText());
        $this->assertCount(2, $tokens[0]->getSourceItemAddresses());
        
        $this->assertEquals('.', $tokens[1]->getText());
        $this->assertEquals('moretext', $tokens[2]->getText());
        $this->assertEquals(' ', $tokens[3]->getText());
        $this->assertEquals('andmore', $tokens[4]->getText());
        
    }
    
    public function testTranscriptionWithMarks() {
        $dt = new DocumentTranscriptionBasic();
        
        $ptf = new PageTranscriptionFactory();
        
        $dt->setPageTranscription(1, $ptf->createPageTranscriptionFromColumnItemArray([[
            new Mark('note', 'note1'),
            new TextualItem('Text'),
            new Mark('note', 'note2'),
            new TextualItem('more te'),
            new Core\Item\NoWbMark(),
            new TextualItem("\nxt"),
            new Mark('note', 'note3'),
        ]]));
        
        $dtw = new SimpleTranscriptionWitness('Test Work', 'Test Chunk', $dt);
        
        $tokens = $dtw->getTokens();
        
        $this->assertCount(4, $tokens);
        
        // Check item indexes
        $this->assertEquals([1], $tokens[0]->getSourceItemIndexes());
        $this->assertEquals([3], $tokens[1]->getSourceItemIndexes());
        $this->assertEquals([3], $tokens[2]->getSourceItemIndexes());
        $this->assertEquals([3,5], $tokens[3]->getSourceItemIndexes());
        
        $nonTokenIndexes = $dtw->getNonTokenItemIndexes();
        
        $expectedNonTokenIndexes = [
            [ 'pre' => [0], 'post' => [2]],  // token 0
            [ 'pre' => [], 'post' => []],   // token 1
            [ 'pre' => [], 'post' => []],   // token 2
            [ 'pre' => [], 'post' => [6]]    // token 3
        ];
        
        $this->assertEquals($expectedNonTokenIndexes, $nonTokenIndexes);
    }
}
