<?php


namespace APM\ToolBox;


class StringFilter
{

    const BOM_UTF8_STRING = "\xEF\xBB\xBF";
    /**
     * Removes Byte Order Mark characters from a utf-8 encoded string
     *
     * @param string $utf8EncodedString
     * @return string
     */
    public static function removeBOMsFromString(string $utf8EncodedString) : string {
        return str_replace(self::BOM_UTF8_STRING,'', $utf8EncodedString);
    }
}