<?php

namespace APM\EntitySystem\ValueType;




use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Kernel\ValueTypeValidator;

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