<?php

namespace APM\EntitySystem\ValueType;




use APM\EntitySystem\Kernel\ValueTypeValidator;

class GpsCoordinatesValidator implements ValueTypeValidator
{

    /**
     * @inheritDoc
     */
    public function stringIsValid(string $str): bool
    {
        [ $lat, $long] = explode(" ", $str);

        return is_numeric($lat) && is_numeric($long) && floatval($lat) <= 180 && floatval($lat) >= -180 &&
            floatval($long) <= 180 && floatval($long) >= -180;
    }
}