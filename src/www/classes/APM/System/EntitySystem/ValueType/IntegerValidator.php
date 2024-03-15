<?php

namespace ThomasInstitut\EntitySystem\ValueType;

use ThomasInstitut\EntitySystem\ValueTypeValidator;

class IntegerValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return is_numeric($str) && intval($str) == floatval($str);
    }
}