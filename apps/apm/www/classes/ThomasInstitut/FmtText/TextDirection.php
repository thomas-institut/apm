<?php

namespace ThomasInstitut\FmtText;

/**
 * Allowed values for `FmtTextTextToken::$textDirection`.
 *
 * Mirrors the TS type `'' | 'ltr' | 'rtl'`.
 */
class TextDirection
{
    public const string DEFAULT = '';
    public const string LTR = 'ltr';
    public const string RTL = 'rtl';

    /**
     * Returns true if the given value is a valid text direction.
     */
    public static function isValid(?string $value): bool
    {
        if ($value === null) {
            return true;
        }
        return in_array($value, [self::DEFAULT, self::LTR, self::RTL], true);
    }
}
