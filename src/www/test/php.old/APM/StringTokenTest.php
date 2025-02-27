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

namespace Test\APM;

use APM\Core\Token\TokenType;
use PHPUnit\Framework\TestCase;

use APM\Core\Token\Token;
use APM\Core\Token\StringToken;
use APM\Core\Address\IntRange;


/**
 * StringToken class test
 *  
 * As of 2018-10-02, just testing what's needed for 100% coverage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class StringTokenTest extends TestCase {
    
   
    
    public function testSimple() {
      $token = new StringToken(TokenType::WORD, 'text', 1,1);
      
      $this->assertEquals('text', $token->getNormalization());
      
      $currentLineRange = $token->getLineRange();
      $this->assertEquals(1, $currentLineRange->getStart());
      $this->assertEquals(1, $currentLineRange->getEnd());
      $token->setLineRange(new IntRange(1,2));
      $currentLineRange2 = $token->getLineRange();
      $this->assertEquals(1, $currentLineRange2->getStart());
      $this->assertEquals(2, $currentLineRange2->getEnd());
        
    }
    
}
