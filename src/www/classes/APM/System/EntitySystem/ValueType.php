<?php

namespace APM\System\EntitySystem;

use APM\System\EntitySystem\ValueType\BooleanValidator;
use APM\System\EntitySystem\ValueType\DateValidator;
use APM\System\EntitySystem\ValueType\EmailAddressValidator;
use APM\System\EntitySystem\ValueType\GpsCoordinatesValidator;
use APM\System\EntitySystem\ValueType\IntegerValidator;
use APM\System\EntitySystem\ValueType\NumberValidator;
use APM\System\EntitySystem\ValueType\TextValidator;
use APM\System\EntitySystem\ValueType\TimestampValidator;
use APM\System\EntitySystem\ValueType\TimeStringValidator;
use APM\System\EntitySystem\ValueType\UrlValidator;
use APM\System\EntitySystem\ValueType\VagueDate;

/**
 * Entity ids for entity types
 */
class ValueType implements ValueTypeDefiner
{
    use TidDefinerTrait;

  // Tids 101-199
  const Text = 101;
  const Number = 102;
  const Integer = 103;
  const Boolean = 104;
  const Timestamp = 105;
  const Date = 106;
  const VagueDate = 107;
  const TimeString = 108;
  const GpsCoordinates = 109;
  const Url = 110;
  const EmailAddress = 111;

    /**
     * @inheritDoc
     */
    public static function getValueTypeValidator(int $tid): ?ValueTypeValidator
    {
        return match ($tid) {
            self::Text=> new TextValidator(),
            self::Boolean => new BooleanValidator(),
            self::Number => new NumberValidator(),
            self::Integer => new IntegerValidator(),
            self::Timestamp => new TimestampValidator(),
            self::Date => new DateValidator(),
            self::VagueDate => new VagueDate(),
            self::TimeString => new TimeStringValidator(),
            self::GpsCoordinates => new GpsCoordinatesValidator(),
            self::Url => new UrlValidator(),
            self::EmailAddress => new EmailAddressValidator(),
            default => null,
        };
    }
}