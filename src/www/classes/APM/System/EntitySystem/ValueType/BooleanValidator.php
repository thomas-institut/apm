<?php

namespace ThomasInstitut\EntitySystem\ValueType;

use ThomasInstitut\EntitySystem\ApmEntitySystemInterface;
use ThomasInstitut\EntitySystem\ValueTypeValidator;

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