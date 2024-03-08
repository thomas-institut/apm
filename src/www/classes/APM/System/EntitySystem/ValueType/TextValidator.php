<?php

namespace APM\System\EntitySystem\ValueType;

use APM\System\EntitySystem\ValueTypeValidator;

class TextValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return  true;
    }
}