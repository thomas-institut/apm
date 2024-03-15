<?php

namespace ThomasInstitut\EntitySystem\ValueType;

use ThomasInstitut\EntitySystem\ValueTypeValidator;

class TimestampValidator implements ValueTypeValidator
{

    const minTimestamp  = 1464739200; //  2016-06-01 0:00:00 UTC
    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return intval($str) > self::minTimestamp;
    }
}