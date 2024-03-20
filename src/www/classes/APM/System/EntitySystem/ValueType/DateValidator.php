<?php

namespace APM\System\EntitySystem\ValueType;



use APM\System\EntitySystem\ValueTypeValidator;
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