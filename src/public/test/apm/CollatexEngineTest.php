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
use APM\CollationEngine\Collatex;
/**
 * Description of ItemArrayTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CollatexEngineTest extends TestCase
{
    const COLLATEX_JAR = '../collatex/bin/collatex-tools-1.7.1.jar';
        
    public function createCollatexRunner()
    {
        return new Collatex(self::COLLATEX_JAR, __DIR__ . '/tmp', '/usr/bin/java');
    }
    
    public function createSimpleCollatexInput() 
    {
        return [
            "witnesses" => [
                [
                    "id" => 'A',
                    'content' => 'A black cat in a black basket'
                ],
                [
                    "id" => 'B',
                    'content' => 'A brown cat in a brown basket'
                ]
            ]
        ];
    }
    
    public function testRunningEnvironmentCheck()
    {
        $cr1 = new Collatex('badexec', 'badtemp', 'badjava');
        $result1 = $cr1->runningEnvironmentOk();
        $this->assertFalse($result1);
        $this->assertEquals(Collatex::CR_COLLATEX_EXECUTABLE_NOT_FOUND, $cr1->getErrorCode());
        
        $cr2 = new Collatex(self::COLLATEX_JAR, 'badtemp', 'badjava');
        $result2 = $cr2->runningEnvironmentOk();
        $this->assertFalse($result2);
        $this->assertEquals(Collatex::CR_TEMP_FOLDER_NOT_FOUND, $cr2->getErrorCode());
        $this->assertFalse($cr2->rawRun(''));
        
        $cr3 = new Collatex(self::COLLATEX_JAR, '/var', 'badjava');
        $result3 = $cr3->runningEnvironmentOk();
        $this->assertFalse($result3);
        $this->assertEquals(Collatex::CR_TEMP_FOLDER_NOT_WRITABLE, $cr3->getErrorCode());
        
        $cr4 = new Collatex(self::COLLATEX_JAR, __DIR__ . '/tmp', 'badjava');
        $result4 = $cr4->runningEnvironmentOk();
        $this->assertFalse($result4);
        $this->assertEquals(Collatex::CR_JAVA_EXECUTABLE_NOT_FOUND, $cr4->getErrorCode());
        
        $cr5 = $this->createCollatexRunner();
        $result5 = $cr5->runningEnvironmentOk();
        $this->assertTrue($result5);
    }
    
    public function testRawRun()
    {
        $goodJson = json_encode($this->createSimpleCollatexInput());
        
        $cr1 = new Collatex(__DIR__ . '/mock-collatex/exit1.bash', __DIR__ . '/tmp', '/usr/bin/java');
        $this->assertTrue($cr1->runningEnvironmentOk());
        $result = $cr1->rawRun($goodJson);
        $this->assertFalse($result); 
        $this->assertEquals(Collatex::CR_COLLATEX_EXIT_VALUE_NON_ZERO, $cr1->getErrorCode());
        
        
        $cr = $this->createCollatexRunner();
        
        $result = $cr->rawRun('bad json');
        $this->assertNotFalse($result);
        $this->assertEquals(null, json_decode($result));

        $result = $cr->rawRun($goodJson);
        $this->assertNotFalse($result);
    }
    
    public function testSimpleRun()
    {
        // Test case 1: error in collatex executable
        $cr1 = new Collatex(__DIR__ . '/mock-collatex/exit1.bash', __DIR__ . '/tmp', '/usr/bin/java');
        $result1 = $cr1->collate([]);
        $this->assertEquals([], $result1);
        $this->assertEquals(Collatex::CR_COLLATEX_EXIT_VALUE_NON_ZERO, $cr1->getErrorCode());
        
        // Test case 2: invalid witness list, Collatex returns error message
        $cr2 = $this->createCollatexRunner();
        $result2 = $cr2->collate([]);
        $this->assertEquals([], $result2);
        $this->assertEquals(Collatex::CR_COLLATEX_DID_NOT_RETURN_JSON, $cr2->getErrorCode());
        
        $cr3 = $this->createCollatexRunner();
        $validWitnessList = [
            [ 'id' => 'A', 'content' => 'This is Sparta and this is not'],
            [ 'id' => 'B', 'content' => 'This is Athens and this is not'],
            [ 'id' => 'C', 'content' => 'This is Athens and this is Sparta']
        ];
        $result3 = $cr3->collate($validWitnessList);
        $this->assertTrue(is_array($result3));
        $this->assertArrayHasKey('witnesses', $result3);
        $this->assertArrayHasKey('table', $result3);
        $this->assertEquals(['A', 'B', 'C'], $result3['witnesses']);
    }
}
