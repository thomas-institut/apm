<?php

namespace APM\System\EntitySystem\ValueType;

use APM\System\EntitySystem\ValueTypeValidator;

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