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

namespace APM\Test\ToolBox;

use APM\System\Transcription\TxText\Text;
use APM\ToolBox\MyersDiff;
use PHPUnit\Framework\TestCase;



/**
 * Description of MyersDiffTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class MyersDiffTest extends TestCase {
    
    public function testSimple()
    {
        
        $a = ['a', 'b', 'c', 'a', 'b', 'b', 'a'];
        $b = ['a', 'x', 'c', 'b', 'a', 'b', 'a', 'c', 'h', 'i', 'j'];

        $editScript = MyersDiff::calculate($a, $b, function ($x,$y) {
            return $x === $y;
        });
        
        $edited = [];

        $deletes = [];
        $keeps = [];
        $adds = [];
        foreach ($editScript as $cmd ) {
            list($index, $command, $seq) = $cmd;
            switch ($command) {
                case -1:
                    $deletes[] = $index;
                    break;

                case 0:
                    $keeps[] = $index;
                    $edited[$seq] = $a[$index];
                    break;

                case 1:
                    $adds[] = $index;
                    $edited[$seq] = $b[$index];
                    break;
            }
        }
        
        $this->assertEquals($b, $edited);
        $this->assertEquals([1, 5], $deletes);
        $this->assertEquals([0, 2, 3, 4, 6], $keeps);
        $this->assertEquals([1,3,7,8,9,10], $adds);
    }

    public function testSimple2() {

        $testCases = [
            [ 'array1' => [4,5,6,7], 'array2' => [4,5,8,7], 'scriptLength' => 5 ]
            ];

        foreach($testCases as $i => $testCase) {
            $script = MyersDiff::calculate($testCase['array1'], $testCase['array2'], function ($x,$y) {
                return $x === $y;
            });
            //print "\n" . $this->prettyPrintScript($script);
            $this->assertCount($testCase['scriptLength'], $script, "Test case " . ($i+1));
        }
    }
    
    public function testItems()
    {
        $a = [];
        $a[] = new Text(1, 1, 'Hello ');
        $a[] = new Text(2, 2, 'my ');
        $a[] = new Text(3, 3, 'world ');
        $b = [];
        $b[] = new Text(1, 1, 'Hello ');
        $b[] = new Text(1, 2, 'you ');
        $b[] = new Text(1, 3, 'miserable ');
        $b[] = new Text(1, 4, 'world ');
        
        $editScript = MyersDiff::calculate($a, $b, function($x, $y) {
            if ($x->type !== $y->type) {
                return false;
            }
            if ($x->theText === $y->theText) {
                return true;
            }
            return false;
        });
       
        $this->assertEquals(MyersDiff::KEEP, $editScript[0][1]);
        $this->assertEquals(MyersDiff::DELETE, $editScript[1][1]);
        $this->assertEquals(MyersDiff::INSERT, $editScript[2][1]);
        $this->assertEquals(MyersDiff::INSERT, $editScript[3][1]);
        $this->assertEquals(MyersDiff::KEEP, $editScript[4][1]);
    }

    protected function prettyPrintScript(array $script): string {
        $output = '';
        foreach($script as $scriptItem) {
            list( $index, $cmd, $seq) = $scriptItem;
            switch($cmd) {
                case 0:
                    $output .=  'KEEP ' . $index . ' ( =  ' . $seq . ")\n";
                    break;

                case 1:
                    $output .=  'ADD after ' . $index . ' element  ' . $seq . "\n";
                    break;

                case -1:
                    $output .=  'DEL ' . $index . "\n";
                    break;
            }
        }
        return $output;
    }

}
