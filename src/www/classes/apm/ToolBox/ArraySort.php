<?php

namespace APM\ToolBox;

class ArraySort
{
    /**
     * Sorts an array by the given key
     *
     * @param array $theArray
     * @param string $key
     */
    public static function byKey(array &$theArray, string $key)
    {
        usort(
            $theArray,
            function ($a, $b) use($key) {
                if (is_object($a)) {
                    $a = (array) $a;
                    $b = (array) $b;
                }
                return $a[$key] < $b[$key] ? -1 : 1;
            }
        );
    }
}