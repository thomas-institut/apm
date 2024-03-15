<?php

namespace ThomasInstitut\EntitySystem\ValueType;

use ThomasInstitut\EntitySystem\ValueTypeValidator;
use ThomasInstitut\TimeString\TimeString;

class TimeStringValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return TimeString::isValid($str);
    }
}