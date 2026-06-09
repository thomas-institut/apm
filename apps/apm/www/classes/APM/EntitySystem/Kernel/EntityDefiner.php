<?php

namespace APM\EntitySystem\Kernel;

interface EntityDefiner
{

    /**
     * Returns all the entity definitions in the class
     * @return EntityDefinition[]
     */
    public function getEntityDefinitions() : array;


    /**
     * Returns an array of triples representing statements involving
     * the entities in the definer
     * @return array
     */
    public function getStatements() : array;

}