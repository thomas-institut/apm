<?php
/*
 * 
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

use APM\Core\Token\Token;
use APM\Core\Token\TranscriptionToken;
use APM\Core\Transcription\ItemAddressInDocument;
use APM\Core\Address\IntRange;


/**
 * TranscriptionToken class  test
 *  
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TranscriptionTokenTest extends TestCase {
    
    
    public function testAddTokens() {
        $t1 = new TranscriptionToken(Token::TOKEN_WORD, 't1');
        $t1->setSourceItemAddresses([new ItemAddressInDocument(1, 0, 0)]);
        $t1->setSourceItemCharRanges([new IntRange(0, 2)]);
        $t2 = new TranscriptionToken(Token::TOKEN_WORD, 't2');
        $t2->setSourceItemAddresses([new ItemAddressInDocument(1, 0, 1)]);
        $t2->setSourceItemCharRanges([new IntRange(0, 2)]);
        
        $tAdd = TranscriptionToken::addTokens($t1, $t2);
        
        $this->assertEquals('t1t2', $tAdd->getText());
        $this->assertEquals('t1t2', $tAdd->getNormalization());
        $this->assertCount(2, $tAdd->getSourceItemAddresses());
        $this->assertCount(2, $tAdd->getSourceItemCharRanges());
    }
    
}
