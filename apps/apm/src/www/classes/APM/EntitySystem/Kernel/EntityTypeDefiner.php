<?php

namespace APM\EntitySystem\Kernel;

interface EntityTypeDefiner extends EntityDefiner
{

    /**
     * @return EntityTypeDefinition[]
     */
    public function getEntityTypeDefinitions() : array;

}