<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\ValueTypeDefiner;
use APM\EntitySystem\Kernel\ValueTypeValidator;
use APM\EntitySystem\ValueType\BooleanValidator;
use APM\EntitySystem\ValueType\DateValidator;
use APM\EntitySystem\ValueType\EmailAddressValidator;
use APM\EntitySystem\ValueType\GpsCoordinatesValidator;
use APM\EntitySystem\ValueType\IntegerValidator;
use APM\EntitySystem\ValueType\NumberValidator;
use APM\EntitySystem\ValueType\TextValidator;
use APM\EntitySystem\ValueType\TimestampValidator;
use APM\EntitySystem\ValueType\TimeStringValidator;
use APM\EntitySystem\ValueType\UrlValidator;
use APM\EntitySystem\ValueType\VagueDate;
use APM\EntitySystem\ValueType\WorkIdValidator;


const ValueTypeEntityDefs = [

    [
        Entity::ValueTypeText,
        'ValueType Text',
        'Any text',
        [],
        []
    ],
    [
        Entity::ValueTypeNumber,
        'ValueType Number',
        'A base-10 number with or without decimals and powers of ten',
        [],
        []
    ],
    [
        Entity::ValueTypeInteger,
        'ValueType Integer',
        'A base-10 integer',
        [],
        []
    ],
    [
        Entity::ValueTypeBoolean,
        'ValueType Boolean',
        "A string that represents true with '1' and false with '0'",
        [],
        []
    ],
    [
        Entity::ValueTypeTimestamp,
        'ValueType Timestamp',
        "A Unix timestamp number",
        [],
        []
    ],
    [
        Entity::ValueTypeDate,
        'ValueType Date',
        "An exact date in the Gregorian calendar, expressed as YYYY-MM-DD",
        [],
        []
    ],
    [
        Entity::ValueTypeVagueDate,
        'ValueType VagueDate',
        "A vague date represented as one or two exact dates (post/ante) with or without circa designations",
        [],
        []
    ],
    [
        Entity::ValueTypeTimeString,
        'ValueType TimeString',
        "A TimeString, an exact time with microsecond resolution expressed as 'YYYY-MM-DD HH:MM:SS.mmmmmm",
        [],
        []
    ],
    [
        Entity::ValueTypeGpsCoordinates,
        'ValueType GpsCoordinates',
        "Lat/long decimal coordinates, e.g. '50.936389, 6.952778'",
        [],
        []
    ],
    [
        Entity::ValueTypeUrl,
        'ValueType Url',
        "A url",
        [],
        []
    ],
    [
        Entity::ValueTypeWorkId,
        'ValueType WorkId',
        "An APM/Dare work Id, e.g. AW47",
        [],
        []
    ],
    [
        Entity::ValueTypeEmailAddress,
        'ValueType EmailAddress',
        "An email address",
        [],
        []
    ],
];

class ValueTypes implements ValueTypeDefiner
{
    /**
     * @inheritDoc
     */
    public function getValueTypeValidator(int $tid): ?ValueTypeValidator
    {
        return match ($tid) {
            Entity::ValueTypeText => new TextValidator(),
            Entity::ValueTypeBoolean => new BooleanValidator(),
            Entity::ValueTypeNumber => new NumberValidator(),
            Entity::ValueTypeInteger => new IntegerValidator(),
            Entity::ValueTypeTimestamp => new TimestampValidator(),
            Entity::ValueTypeDate => new DateValidator(),
            Entity::ValueTypeVagueDate => new VagueDate(),
            Entity::ValueTypeTimeString => new TimeStringValidator(),
            Entity::ValueTypeGpsCoordinates => new GpsCoordinatesValidator(),
            Entity::ValueTypeUrl => new UrlValidator(),
            Entity::ValueTypeWorkId => new WorkIdValidator(),
            Entity::ValueTypeEmailAddress => new EmailAddressValidator(),
            default => null,
        };
    }



    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(ValueTypeEntityDefs, Entity::tValueType);
    }

  
}