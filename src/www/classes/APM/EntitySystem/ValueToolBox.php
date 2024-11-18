<?php

namespace APM\EntitySystem;

class ValueToolBox
{

    public static function boolToValue(bool $boolean) : string {
        return $boolean ? ApmEntitySystemInterface::ValueTrue : ApmEntitySystemInterface::ValueFalse;
    }

    public static function valueToBool(?string $value) : bool {
        return $value === ApmEntitySystemInterface::ValueTrue;
    }
}