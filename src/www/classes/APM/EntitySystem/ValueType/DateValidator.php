<?php

namespace APM\EntitySystem\ValueType;




use APM\EntitySystem\Kernel\ValueTypeValidator;

class DateValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        // TODO: implement this
        return true;
    }
}