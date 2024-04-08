<?php
namespace APM\EntitySystem\ValueType;




use APM\EntitySystem\Kernel\ValueTypeValidator;

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