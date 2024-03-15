<?php

namespace ThomasInstitut\EntitySystem\ValueType;

use ThomasInstitut\EntitySystem\ValueTypeValidator;

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