<?php

namespace APM\System\EntitySystem\ValueType;

use APM\System\EntitySystem\ValueTypeValidator;
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