<?php

namespace ThomasInstitut\EntitySystem\ValueType;

use ThomasInstitut\EntitySystem\ValueTypeValidator;

class NumberValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return is_numeric($str);
    }
}