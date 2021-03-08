<?php


namespace APM\CollationTable;


class ToLowerCaseNormalizer extends SimpleStringNormalizer
{
    public function normalizeString(string $str): string
    {
        return strtolower($str);
    }
}