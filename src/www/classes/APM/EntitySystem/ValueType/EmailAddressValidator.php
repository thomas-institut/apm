<?php

namespace APM\EntitySystem\ValueType;




use APM\EntitySystem\Kernel\ValueTypeValidator;

class EmailAddressValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return filter_var($str, FILTER_VALIDATE_EMAIL);
    }
}