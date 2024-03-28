<?php

namespace APM\EntitySystem\Kernel;

interface PredicateDefiner extends EntityDefiner
{

    /**
     * Returns all predicated definitions in the class
     * @return PredicateDefinition[]
     */
    public function getPredicateDefinitions() : array;
}