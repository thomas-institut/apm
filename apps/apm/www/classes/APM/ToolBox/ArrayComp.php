<?php

namespace APM\ToolBox;

class ArrayComp
{

    /**
     * Returns true if for every $i, a[$i] === b[$i]
     * @param array $a
     * @param array $b
     * @return bool
     */
    static public function areEqual(array $a, array $b): bool {
        if (count($a) !== count($b)) {
            return false;
        }
        for ($i = 0; $i < count($a); $i++) {
            if ($a[$i] !== $b[$i]) {
                return false;
            }
        }
        return true;
    }
}