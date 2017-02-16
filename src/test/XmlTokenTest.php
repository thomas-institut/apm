<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
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


require '../public/vendor/autoload.php';
require_once '../public/classes/XmlToken.php';

use AverroesProject\XmlToken;
use Matcher\Pattern;
use Matcher\Condition;
use Matcher\State;

/**
 * Description of XmlTokenTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class XmlTokenTest extends PHPUnit_Framework_TestCase {
    
    public function testSimple(){
        $p = (new Pattern())->withTokenSeries([ 
            XmlToken::elementToken('tei'), 
            XmlToken::textToken(),
            XmlToken::endElementToken('tei')
        ]);
        //print_r($p);
        $r = new XMLReader();
        $r->XML('<tei>Some test</tei>');
        while ($r->read()){
            $p->match($r);
        }
        $this->assertEquals(true, $p->matchFound());
        
        $p->reset();
        $r->XML('<other>Some test</other>');
        while ($r->read()){
            $p->match($r);
        }
        $this->assertEquals(false, $p->matchFound());
        
        $p->reset();
        $r->XML('<tei><other/>Some test</tei>');
        while ($r->read()){
            $p->match($r);
        }
        $this->assertEquals(false, $p->matchFound());
        
        $p->reset();
        $r->XML('<tei>Some test<other/></tei>');
        while ($r->read()){
            $p->match($r);
        }
        $this->assertEquals(false, $p->matchFound());
    }
    
    public function testReqAttributes(){
        $p = (new Pattern())->withTokenSeries([ 
            XmlToken::elementToken('test')->withReqAttrs([ ['r', 'yes']]), 
            XmlToken::elementToken('other')->withReqAttrs([ ['n', '*']]),
            XmlToken::endElementToken('test')
        ]);
        //print_r($p);
        $r = new XMLReader();
        $r->XML('<test r="yes"><other n="doesntmatter"/></test>');
        while ($r->read()){
            $p->match($r);
        }
        $this->assertEquals(true, $p->matchFound());
        //print_r($p);
        
        $p->reset();
        $r->XML('<test r="no"><other n="doesntmatter"/></test>');
        while ($r->read()){
            $p->match($r);
        }
        $this->assertEquals(false, $p->matchFound());
        
        $p->reset();
        $r->XML('<test x="yes"><other n="doesntmatter"/></test>');
        while ($r->read()){
            $p->match($r);
        }
        $this->assertEquals(false, $p->matchFound());
        
       
    }
    
}
