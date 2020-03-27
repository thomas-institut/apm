<?php


namespace APM\ToolBox;


class StringFilter
{
    /**
     * Removes Byte Order Mark characters from a utf-8 encoded string
     *
     * @param string $utf8EncodedString
     * @return string
     */
    public static function removeBOMsFromString(string $utf8EncodedString) : string {
        return str_replace("\xEF\xBB\xBF",'',$utf8EncodedString);
    }
}