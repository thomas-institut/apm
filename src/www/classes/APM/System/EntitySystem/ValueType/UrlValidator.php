<?php

namespace APM\System\EntitySystem\ValueType;

use APM\System\EntitySystem\ValueTypeValidator;

class UrlValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return filter_var($str, FILTER_VALIDATE_URL);
    }
}