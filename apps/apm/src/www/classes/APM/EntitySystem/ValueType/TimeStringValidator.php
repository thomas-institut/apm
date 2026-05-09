<?php
namespace APM\EntitySystem\ValueType;



use APM\EntitySystem\Kernel\ValueTypeValidator;
use ThomasInstitut\TimeString\TimeString;

class TimeStringValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        return TimeString::isValid($str);
    }
}