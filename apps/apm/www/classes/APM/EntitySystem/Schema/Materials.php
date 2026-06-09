<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;


const MaterialDefinitions = [
    [ Entity::MaterialPaper, 'Paper', 'Material Paper'],
    [ Entity::MaterialParchment, 'Parchment', 'Material Parchment'],
    [ Entity::MaterialVellum, 'Vellum', 'Material Vellum'],
    [ Entity::MaterialMixed, 'Mixed', 'Material Mixed'],
    [ Entity::MaterialTissue, 'Tissue', 'Material Tissue'],
];

class Materials implements EntityDefiner
{
    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
      return DefsFromArray::getEntityDefinitionsFromArray(MaterialDefinitions, Entity::tDareMaterial);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}


