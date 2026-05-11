<?php

namespace ThomasInstitut\Lib\Settable;

use LogicException;
use ReflectionClass;
use ReflectionIntersectionType;
use ReflectionNamedType;
use ReflectionProperty;
use ReflectionType;
use ReflectionUnionType;

trait FromFlatArrayTrait
{

    /**
     * @inheritDoc
     */
    public function fromArray(array $config): void {
        $reflection = new ReflectionClass($this);
        $publicProperties = $reflection->getProperties(ReflectionProperty::IS_PUBLIC);

        foreach ($publicProperties as $property) {
            if ($property->isStatic()) {
                continue;
            }

            $key = $property->getName();
            if (!$property->hasDefaultValue() && !array_key_exists($key, $config)) {
                throw new MissingRequiredValueException("Missing required config value for property '$key'");
            }

            if (array_key_exists($key, $config)) {
                $value = $config[$key];
                $type = $property->getType();

                if ($type !== null && !$this->isTypeMatch($type, $value)) {
                    throw new WrongValueTypeException("Invalid type for property '$key': expected $type, got " . gettype($value));
                }

                $this->$key = $value;
            }
        }
    }

    /**
     * Checks if the given value matches the given reflection type.
     *
     * @param ReflectionType $type
     * @param mixed $value
     * @return bool
     */
    private function isTypeMatch(ReflectionType $type, mixed $value): bool {
        if ($value === null) {
            return $type->allowsNull();
        }

        if ($type instanceof ReflectionNamedType) {
            return $this->isValidNamedType($type->getName(), $value);
        }

        if ($type instanceof ReflectionUnionType) {
            foreach ($type->getTypes() as $unionType) {
                if ($this->isTypeMatch($unionType, $value)) {
                    return true;
                }
            }
            return false;
        }

        if ($type instanceof ReflectionIntersectionType) {
            foreach ($type->getTypes() as $intersectionType) {
                if (!$this->isTypeMatch($intersectionType, $value)) {
                    return false;
                }
            }
            return true;
        }

        // this can never happen, we have checked all possible options already
        throw new LogicException('Unexpected type encountered'); // @codeCoverageIgnore
    }

    /**
     * Checks if the given value matches the given named type.
     *
     * @param string $typeName
     * @param mixed $value
     * @return bool
     */
    private function isValidNamedType(string $typeName, mixed $value): bool {
        return match ($typeName) {
            'string' => is_string($value),
            'int' => is_int($value),
            'float' => is_float($value) || is_int($value),
            'bool' => is_bool($value),
            'array' => is_array($value),
            'object' => is_object($value),
            'mixed' => true,
            'false' => $value === false,
            'true' => $value === true,
            'null' => $value === null,
            default => $value instanceof $typeName,
        };
    }
}
