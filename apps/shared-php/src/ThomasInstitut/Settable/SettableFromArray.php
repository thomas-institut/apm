<?php

namespace ThomasInstitut\Settable;

interface SettableFromArray
{

    /**
     * Populates itself with the values from the given array.
     *
     * Ignores any keys that do not match the public properties of the class.
     *
     * Throws an exception if the array contains values of the wrong type and if any property without
     * a default value is missing.
     *
     * @param array $config
     * @return void
     * @throws WrongValueTypeException
     * @throws MissingRequiredValueException
     */
    public function fromArray(array $config): void;
}
