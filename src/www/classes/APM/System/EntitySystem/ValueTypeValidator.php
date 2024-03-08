<?php

namespace APM\System\EntitySystem;

interface ValueTypeValidator
{

    /**
     * Returns true if the given string is a valid value
     * for the type
     *
     * @param string $str
     * @return bool
     */
    public function stringIsValid(string $str) : bool;
}