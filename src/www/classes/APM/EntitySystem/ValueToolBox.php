<?php

namespace APM\EntitySystem;

class ValueToolBox
{

    public static function boolToValue(?bool $boolean) : string {
        if ($boolean === null) {
            return ApmEntitySystemInterface::ValueFalse;
        }
        return $boolean ? ApmEntitySystemInterface::ValueTrue : ApmEntitySystemInterface::ValueFalse;
    }

    /**
     * Returns true if the given value is exactly equal to '1'
     * @param string|null $value
     * @return bool
     */
    public static function valueToBool(?string $value) : bool {
        return $value === ApmEntitySystemInterface::ValueTrue;
    }
}