<?php

namespace APM\EntitySystem\Kernel;

use ReflectionClass;

trait TidDefinerTrait
{

    static function getDefinedTids() : array {
        return (new ReflectionClass(static::class))->getConstants();
    }

}