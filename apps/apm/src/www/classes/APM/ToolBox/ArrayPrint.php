<?php

namespace APM\ToolBox;

class ArrayPrint
{

    const STYLE_COLUMNS = 'columns';
    const STYLE_LISTING = 'listing';

    /**
     * Prints an associative array as a series of lines:
     *    key1
     * @param array $array
     * @param string $style
     * @return string
     */
    static public function sPrintAssociativeArray(array $array, string $style) : string {
        $output = '';
        $spacesBetweenColumns = 2;
        switch ($style) {
            case self::STYLE_COLUMNS:
                $padding = max(array_map('strlen', array_keys($array)));
                $spacing = str_repeat(' ', $spacesBetweenColumns);
                foreach ($array as $key => $value) {
                    $output .= str_pad($key, $padding) . $spacing . $value . PHP_EOL;
                }
                return $output;

            default:
                foreach ($array as $key => $value) {
                    $output .= "$key: $value" . PHP_EOL;
                }
                return $output;
        }
    }

}