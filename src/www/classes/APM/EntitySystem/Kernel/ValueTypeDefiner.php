<?php

namespace APM\EntitySystem\Kernel;


interface ValueTypeDefiner extends EntityDefiner
{

    /**
     * Returns the validator for the given tid or null if the tid
     * is not defined in the class
     *
     * @param int $tid
     * @return ValueTypeValidator|null
     */
    public function getValueTypeValidator(int $tid): ?ValueTypeValidator;

}