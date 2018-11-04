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
      $token = new StringToken(Token::TOKEN_WORD, 'text', 1,1);
      
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