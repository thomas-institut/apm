<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject;
require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use AverroesProject\Collation\Tokenizer;
use AverroesProject\TxText\Text;

/**
 * Description of TranscriptionReaderTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TokenizerTest extends TestCase {
     
       
    public function testSimpleTokens(){
        
        $items1 = [];
        $items1[] = new Text(1, 0, "This is   a   simple ");
        $items1[] = new TxText\Rubric(2, 1, "rubric   ");
        $items1[] = new TxText\Sic(3, 2, 'wit a', 'with a');
        $items1[] = new Text(4, 3, "correction");
        
        $tokens1 = Tokenizer::tokenize($items1);
        var_dump($tokens1);
        $expectedTokens1 = ['This', 'is', 'a', 'simple', 'rubric', 'wit', 'a', 'correction'];
        $this->assertCount(count($expectedTokens1), $tokens1);
        for($i = 0; $i < count($tokens1); $i++){
            $this->assertEquals($expectedTokens1[$i], $tokens1[$i]['t']);
        }
    }

}
