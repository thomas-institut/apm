<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM;
require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;

use APM\Struct\Struct;

/**
 * Description of testWitness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class testStruct extends TestCase {
    
    public function testGetAndSetFields() {
        
        /** @var Struct $testStruct */
        $testStruct = new Struct(['field1', 'field2']);
        
        $testStringValue = 'This is a test';
        $testStringValue2 = 'This is another test';
        $testIntValue = 1234;
        
        $this->assertFalse($testStruct->isFieldSet('field1'));
        $this->assertFalse($testStruct->isFieldSet('field2'));
        $this->assertFalse($testStruct->isFieldSet('field3'));
        
        $exceptionCaught = false;
        try {
            $testStruct->field1;
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $exceptionCaught = false;
        try {
            $testStruct->getField('field1');
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        
        
        $testStruct->field1 = $testStringValue;
        $this->assertEquals($testStringValue, $testStruct->field1);
        $this->assertEquals($testStringValue, $testStruct->getField('field1'));
        $testStruct->setField('field1', $testStringValue2);
        $this->assertEquals($testStringValue2, $testStruct->field1);
        $this->assertEquals($testStringValue2, $testStruct->getField('field1'));
        
        $exceptionCaught = false;
        try {
            $testStruct->field2;
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        
        $exceptionCaught = false;
        try {
            $testStruct->getField('field2');
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        
        $testStruct->field2 = $testIntValue;
        $this->assertEquals($testIntValue, $testStruct->field2);
        $this->assertEquals($testIntValue, $testStruct->getField('field2'));
        $testStruct->setField('field2', $testStringValue2);
        $this->assertEquals($testStringValue2, $testStruct->field2);
        $this->assertEquals($testStringValue2, $testStruct->getField('field2'));
        
        $exceptionCaught = false;
        try {
            $testStruct->field3;
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $exceptionCaught = false;
        try {
            $testStruct->getField('field3');
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        
        $testStruct->field3 = $testStringValue;
        $exceptionCaught = false;
        try {
            $testStruct->field3;
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        
        $exceptionCaught = false;
        try {
            $testStruct->getField('field3');
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        
        $testStruct->setField('field3', $testIntValue, true);
        $this->assertFalse($testStruct->isFieldSet('field3'));
        $testStruct->setField('field3', $testIntValue);
        $this->assertTrue($testStruct->isFieldSet('field3'));
        $this->assertEquals($testIntValue, $testStruct->getField('field3'));
        $exceptionCaught = false;
        try {
            $testStruct->field3;
        } catch (\Exception $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        
        $theData = $testStruct->getArray();
        $this->assertCount(3, $theData);
        
        $theData2 = $testStruct->getArray(true);
        $this->assertCount(2, $theData2);
    }
    
    public function testFieldAliases(){
        
        $theStruct = new Struct(['field1', 'field2']);
        
        $theStruct->setFromArray(['field1' => 11, 'field2' => 12]);
        $this->assertEquals(11, $theStruct->field1);
        $this->assertEquals(12, $theStruct->field2);
        
        $theStruct->setFromArray(['field1alias' => 21, 'field2alias' => 22], 
                true, 
                ['field1' => 'field1alias', 'field2'=> 'field2alias']);
        $this->assertEquals(21, $theStruct->field1);
        $this->assertEquals(22, $theStruct->field2);
        
        $theStruct->setFromArray(['field1alias' => 31, 'field2' => 32], 
                true, 
                ['field1' => 'field1alias', 'field2'=> 'field2alias']);
        $this->assertEquals(31, $theStruct->field1);
        $this->assertEquals(32, $theStruct->field2);
        
        $theStruct->setFromArray(['field1alias' => 31, 'field2' => 32, 'field2alias' => 33], 
                true, 
                ['field1' => 'field1alias', 'field2' => 'field2alias']);
        $this->assertEquals(31, $theStruct->field1);
        // field2alias comes last, so field2 gets its value
        $this->assertEquals(33, $theStruct->field2);
        
        $theStruct->setFromArray(['field1alias' => 41, 'field2alias' => 42, 'field2' => 43], 
                true, 
                ['field1' => 'field1alias', 'field2' => 'field2alias']);
        $this->assertEquals(41, $theStruct->field1);
        // field2 comes last, so field2 gets its value
        $this->assertEquals(43, $theStruct->field2);
    }
    
    
    
    
}
