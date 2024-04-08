<?php

namespace APM\EntitySystem\Kernel;

interface EntityDefiner
{

    /**
     * Returns all the entity definitions in the class
     * @return EntityDefinition[]
     */
    public function getEntityDefinitions() : array;

}