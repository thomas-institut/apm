<?php

namespace ThomasInstitut\ToolBox;

use InvalidArgumentException;

class ArrayUtils
{

    /**
     * Returns a new associative array that is a deep copy of the given array
     * with fields updated with the contents of the given update array.
     *
     * For example, if the array to update is ``[ 'color' => 'green' , 'size' => 12]``
     * and the update is ``[ 'color' => 'red']`` the output will be ``[ 'color' => 'red' , 'size' => 12]``
     *
     * The method will process all fields in the input array recursively.
     *
     * @param array $array
     * @param array $update
     * @param string $parentKeyId
     * @return array
     */
    public static function getUpdatedArray(array $array, array $update, string $parentKeyId = '') : array {
        $outputArray = [];
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                if (isset($update[$key])) {
                    if (!is_array($update[$key])) {
                        throw new InvalidArgumentException("Trying to update array $parentKeyId:$key with non array");
                    }
                    $outputArray[$key] = self::getUpdatedArray($value, $update[$key],  "$parentKeyId:$key");
                } else {
                    // get the update with an empty array so that we get a deep copy
                    $outputArray[$key] = self::getUpdatedArray($value, []);
                }
            } else {
                $outputArray[$key] = $update[$key] ?? $value;
            }
        }
        foreach ($update as $key => $value) {
            if (!isset($outputArray[$key])) {
                $outputArray[$key] = $value;
            }
        }
        return $outputArray;
    }

    public static function deepCopy(array $array) : array {
        return self::getUpdatedArray($array, []);
    }
}