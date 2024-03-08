<?php

namespace APM\System\EntitySystem;

interface ValueTypeDefiner extends TidDefiner
{

    /**
     * Returns the validator for the given ValueType tid.
     *
     * If the value type is not defined, returns null
     *
     * @param int $tid
     * @return ValueTypeValidator|null
     */
    public static function getValueTypeValidator(int $tid) : ?ValueTypeValidator;
}