<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;

require "../vendor/autoload.php";

use AverroesProject\Algorithm\MyersDiff;
use PHPUnit\Framework\TestCase;

use AverroesProject\TxText\Text;
use AverroesProject\TxText\Abbreviation;

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
        var_dump($editScript);
        
        $this->assertEquals(MyersDiff::KEEP, $editScript[0][1]);
        $this->assertEquals(MyersDiff::DELETE, $editScript[1][1]);
        $this->assertEquals(MyersDiff::INSERT, $editScript[2][1]);
        $this->assertEquals(MyersDiff::INSERT, $editScript[3][1]);
        $this->assertEquals(MyersDiff::KEEP, $editScript[4][1]);
        
        
    }
}
