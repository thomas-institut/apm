<?php

namespace ThomasInstitut\Settable;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class FromFlatArrayTraitTest extends TestCase
{
    public function testFromArrayOnlySetsPublicProperties(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public string $publicProp = 'default';
            public ?string $nullableProp = 'default';
            public static string $staticProp = 'default';
            protected string $protectedProp = 'default';
            private string $privateProp = 'default';

            public function getProtectedProp(): string
            {
                return $this->protectedProp;
            }

            public function getPrivateProp(): string
            {
                return $this->privateProp;
            }
        };

        $data = [
            'publicProp' => 'new value',
            'nullableProp' => null,
            'staticProp' => 'new static value',
            'protectedProp' => 'should not change',
            'privateProp' => 'should not change',
            'nonExistentProp' => 'should not be set',
        ];

        $configObject->fromArray($data);

        $this->assertEquals('new value', $configObject->publicProp);
        $this->assertNull($configObject->nullableProp);
        $this->assertEquals('default', $configObject::$staticProp);
        $this->assertEquals('default', $configObject->getProtectedProp());
        $this->assertEquals('default', $configObject->getPrivateProp());
        $this->assertFalse(property_exists($configObject, 'nonExistentProp'));
    }

    /**
     * Tests that fromArray handles Union types correctly.
     *
     * @return void
     */
    public function testFromArrayWithUnionType(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public string|int $unionProp;
        };

        $configObject->fromArray(['unionProp' => 'a string']);
        $this->assertEquals('a string', $configObject->unionProp);

        $configObject->fromArray(['unionProp' => 123]);
        $this->assertEquals(123, $configObject->unionProp);

        $this->expectException(WrongValueTypeException::class);
        $configObject->fromArray(['unionProp' => true]);
    }

    /**
     * Tests that fromArray handles Intersection types correctly.
     *
     * @return void
     */
    public function testFromArrayWithIntersectionType(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public \Countable&\ArrayAccess $intersectionProp;
        };

        $val = new \ArrayObject([1, 2, 3]);
        $configObject->fromArray(['intersectionProp' => $val]);
        $this->assertSame($val, $configObject->intersectionProp);
    }

    /**
     * Tests that fromArray fails if only one interface of an intersection type is implemented.
     *
     * @return void
     */
    public function testFromArrayWithIntersectionTypeFailsIfOnlyOneImplemented(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public \Countable&\ArrayAccess $intersectionProp;
        };

        $val = new class implements \Countable {
            public function count(): int { return 0; }
        };

        $this->expectException(WrongValueTypeException::class);
        $configObject->fromArray(['intersectionProp' => $val]);
    }

    /**
     * Tests that fromArray fails if none of the interfaces of an intersection type are implemented.
     *
     * @return void
     */
    public function testFromArrayWithIntersectionTypeFailsIfNoneImplemented(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public \Countable&\ArrayAccess $intersectionProp;
        };

        $this->expectException(WrongValueTypeException::class);
        $configObject->fromArray(['intersectionProp' => new \stdClass()]);
    }

    /**
     * Tests that fromArray handles various named types correctly.
     *
     * @return void
     */
    public function testFromArrayWithVariousNamedTypes(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public float $floatProp;
            public array $arrayProp;
            public object $objectProp;
            public mixed $mixedProp;
            public false $falseProp;
            public true $trueProp;
            public \stdClass $instanceProp;
        };

        $data = [
            'floatProp' => 1.5,
            'arrayProp' => [1, 2, 3],
            'objectProp' => (object)['a' => 1],
            'mixedProp' => 'anything',
            'falseProp' => false,
            'trueProp' => true,
            'instanceProp' => new \stdClass(),
        ];

        $configObject->fromArray($data);

        $this->assertEquals(1.5, $configObject->floatProp);
        $this->assertEquals([1, 2, 3], $configObject->arrayProp);
        $this->assertIsObject($configObject->objectProp);
        $this->assertEquals('anything', $configObject->mixedProp);
        $this->assertFalse($configObject->falseProp);
        $this->assertTrue($configObject->trueProp);
        $this->assertInstanceOf(\stdClass::class, $configObject->instanceProp);

        // Test float accepting int
        $configObject->fromArray([...$data, 'floatProp' => 10]);
        $this->assertEquals(10, $configObject->floatProp);
        $this->assertIsFloat($configObject->floatProp); // in PHP if property is float, it stays float
    }

    /**
     * Tests that fromArray handles DNF (Disjunctive Normal Form) types correctly.
     *
     * @return void
     */
    public function testFromArrayWithDNFType(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public (\Countable&\ArrayAccess)|string $dnfProp;
        };

        $configObject->fromArray(['dnfProp' => 'a string']);
        $this->assertEquals('a string', $configObject->dnfProp);

        $val = new \ArrayObject([1, 2, 3]);
        $configObject->fromArray(['dnfProp' => $val]);
        $this->assertSame($val, $configObject->dnfProp);

        $this->expectException(WrongValueTypeException::class);
        $configObject->fromArray(['dnfProp' => 123]);
    }

    /**
     * Tests that fromArray handles standalone null type correctly.
     *
     * @return void
     */
    public function testFromArrayWithStandaloneNullType(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public null $nullProp;
        };

        $configObject->fromArray(['nullProp' => null]);
        $this->assertNull($configObject->nullProp);

        $this->expectException(WrongValueTypeException::class);
        $configObject->fromArray(['nullProp' => 'not null']);
    }

    #[DataProvider('wrongTypeDataProvider')]
    public function testFromArrayThrowsExceptionOnWrongType(array $data): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public string $stringProp = 'default';
            public int $intProp = 1;
            public bool $boolProp = true;
            public ?string $nullableStringProp = null;
        };

        $this->expectException(WrongValueTypeException::class);

        $configObject->fromArray($data);
    }

    public static function wrongTypeDataProvider(): array
    {
        return [
            'string expected, int given' => [['stringProp' => 123]],
            'int expected, string given' => [['intProp' => '123']],
            'bool expected, int given' => [['boolProp' => 1]],
            'string expected, null given' => [['stringProp' => null]],
        ];
    }

    public function testFromArrayWithCorrectTypes(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public string $stringProp = 'default';
            public int $intProp = 1;
            public bool $boolProp = true;
            public ?string $nullableStringProp = 'default';
            public $untypedProp = 'default';
        };

        $data = [
            'stringProp' => 'new value',
            'intProp' => 42,
            'boolProp' => false,
            'nullableStringProp' => null,
            'untypedProp' => 123.45,
        ];

        $configObject->fromArray($data);

        $this->assertEquals('new value', $configObject->stringProp);
        $this->assertEquals(42, $configObject->intProp);
        $this->assertFalse($configObject->boolProp);
        $this->assertNull($configObject->nullableStringProp);
        $this->assertEquals(123.45, $configObject->untypedProp);
    }

    /**
     * Tests that fromArray throws MissingRequiredConfigValueException when a required property is missing.
     *
     * @return void
     */
    public function testFromArrayThrowsExceptionOnMissingRequiredProperty(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public string $requiredProp;
        };

        $this->expectException(MissingRequiredValueException::class);

        $configObject->fromArray([]);
    }

    /**
     * Tests that fromArray does not throw MissingRequiredConfigValueException when a property has a default value.
     *
     * @return void
     */
    public function testFromArrayDoesNotThrowExceptionWhenPropertyHasDefaultValue(): void
    {
        $configObject = new class {
            use FromFlatArrayTrait;

            public string $optionalProp = 'default';
        };

        $configObject->fromArray([]);
        $this->assertEquals('default', $configObject->optionalProp);
    }
}
