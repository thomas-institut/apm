<?php
namespace APM\System\EntitySystem\ValueType;



use APM\System\EntitySystem\ValueTypeValidator;

class NumberValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return is_numeric($str);
    }
}