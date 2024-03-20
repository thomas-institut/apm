<?php

namespace APM\System\EntitySystem\ValueType;



use APM\System\EntitySystem\ApmEntitySystemInterface;
use APM\System\EntitySystem\ValueTypeValidator;

class BooleanValidator implements ValueTypeValidator
{
    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return in_array($str, [ ApmEntitySystemInterface::ValueFalse, ApmEntitySystemInterface::ValueTrue]);
    }
}