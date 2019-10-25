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

require_once 'SiteMockup/SystemManagerMockup.php';
require_once 'ImageSourcePluginMockup.php';

use PHPUnit\Framework\TestCase;




/**
 * Description of SettingsManagerTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ImageSourcePluginTest extends TestCase {
    
    public function testBasic() 
    {
        $sm = new SystemManagerMockup();
        
        $isp = new \ImageSourcePluginMockup($sm, 'testisp');
        
        $isp->init();
        
        // Activate and deactivate dont' do anything really
        $this->assertTrue($isp->activate());
        $this->assertTrue($isp->deactivate());
        $this->assertEquals([], $isp->getMetadata());
        
        
        // non array parameters 
        $this->assertEquals('somestring', $isp->getImageSource('somestring')); 
        $this->assertEquals('somestring', $isp->getImageUrl('somestring')); 
        $this->assertEquals('somestring', $isp->getDocInfoHtml('somestring')); 
        $this->assertEquals('somestring', $isp->getOpenSeaDragonConfig('somestring')); 
        
        // bad data in parameter array 
        $badArray = ['somefield' => 'somedata', 'otherfield' => 'otherdata'];
        $this->assertEquals($badArray, $isp->getImageUrl($badArray)); 
        $this->assertEquals($badArray, $isp->getDocInfoHtml($badArray)); 
        $this->assertEquals($badArray, $isp->getOpenSeaDragonConfig($badArray)); 
        
        
        $this->assertEquals('testisp', $isp->getImageSource([])[0]);
        
        // good array
        
        $goodArray = ['imageSourceData' => 'somedata', 'imageNumber' => 1];
        $this->assertEquals('ImageUrl', $isp->getImageUrl($goodArray)); 
        $this->assertEquals('DocInfoHtml', $isp->getDocInfoHtml($goodArray)); 
        $this->assertEquals('OpenSeaDragonConfig', $isp->getOpenSeaDragonConfig($goodArray)); 
    }
    
   
}
