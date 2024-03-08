<?php

namespace APM\System\EntitySystem;

use ReflectionClass;

trait TidDefinerTrait
{

    static function getDefinedTids() : array {
        return (new ReflectionClass(static::class))->getConstants();
    }

}