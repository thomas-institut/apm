<?php

namespace ThomasInstitut\Hello;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for Hello
 */
class HelloTest extends TestCase
{
    public function testSayHello(): void
    {
        $hello = new Hello();
        $this->assertEquals('Hello World!', $hello->sayHello('World'));
        $this->assertEquals('Hello Junie!', $hello->sayHello('Junie'));
    }
}
