<?php

namespace Test\APM\Api\Action;

use APM\Api\Action\PageUpdateDefinition;
use PHPUnit\Framework\TestCase;

class PageUpdateDefinitionTest extends TestCase
{
    /**
     * Test that fromArray correctly converts all fields from a complete input array.
     */
    public function testFromArrayWithAllFields(): void
    {
        $data = [
            'docId' => '42',
            'page' => '3',
            'type' => '5',
            'foliation' => '12r',
            'overwriteFoliation' => true,
            'cols' => '2',
            'lang' => '100',
        ];

        $def = PageUpdateDefinition::fromArray($data);

        $this->assertSame(42, $def->docId);
        $this->assertSame(3, $def->page);
        $this->assertSame(5, $def->type);
        $this->assertSame('12r', $def->foliation);
        $this->assertTrue($def->overwriteFoliation);
        $this->assertSame(2, $def->cols);
        $this->assertSame(100, $def->lang);
    }

    /**
     * Test that fromArray sets missing fields to null.
     */
    public function testFromArrayWithMissingFields(): void
    {
        $data = [
            'docId' => '10',
            'page' => '1',
        ];

        $def = PageUpdateDefinition::fromArray($data);

        $this->assertSame(10, $def->docId);
        $this->assertSame(1, $def->page);
        $this->assertNull($def->type);
        $this->assertNull($def->foliation);
        $this->assertNull($def->overwriteFoliation);
        $this->assertNull($def->cols);
        $this->assertNull($def->lang);
    }

    /**
     * Test that fromArray handles an empty array by setting all fields to null.
     */
    public function testFromArrayWithEmptyArray(): void
    {
        $def = PageUpdateDefinition::fromArray([]);

        $this->assertNull($def->docId);
        $this->assertNull($def->page);
        $this->assertNull($def->type);
        $this->assertNull($def->foliation);
        $this->assertNull($def->overwriteFoliation);
        $this->assertNull($def->cols);
        $this->assertNull($def->lang);
    }

    /**
     * Test that fromArray coerces string values to the correct types.
     */
    public function testFromArrayCoercesStringValues(): void
    {
        $data = [
            'docId' => '99',
            'page' => '7',
            'type' => '3',
            'cols' => '4',
            'lang' => '200',
            'overwriteFoliation' => '1',
            'foliation' => 42,
        ];

        $def = PageUpdateDefinition::fromArray($data);

        $this->assertSame(99, $def->docId);
        $this->assertSame(7, $def->page);
        $this->assertSame(3, $def->type);
        $this->assertSame(4, $def->cols);
        $this->assertSame(200, $def->lang);
        $this->assertTrue($def->overwriteFoliation);
        $this->assertSame('42', $def->foliation);
    }
}
