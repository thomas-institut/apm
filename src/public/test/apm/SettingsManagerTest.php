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

namespace APM;

require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use APM\System\SettingsManager;

/**
 * Description of SettingsManagerTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SettingsManagerTest extends TestCase {
    
    public function testBasic() 
    {
        $sm = new SettingsManager();
        
        $r = $sm->getSetting('test');
        $this->assertFalse($r);
        
        $r = $sm->setSetting('setting1', 'somevalue');
        $this->assertTrue($r);
        $r = $sm->getSetting('setting1');
        $this->assertEquals('somevalue', $r);
        $r = $sm->setSetting('setting1', 'othervalue');
        $this->assertTrue($r);
        $r = $sm->getSetting('setting1');
        $this->assertEquals('othervalue', $r);
    }
}
