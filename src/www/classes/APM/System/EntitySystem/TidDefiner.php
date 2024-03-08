<?php

namespace APM\System\EntitySystem;

interface TidDefiner
{
    /**
     * Returns all the tids defined in the class
     * @return int[]
     */
    public static function getDefinedTids() : array;

}