<?php

namespace APM\EntitySystem\Schema;


const IdTypeDefinitions = [

    [
        Entity::IdTypeViaf,
        'VIAF',
        'A VIAF id',
        [],
        []
    ],
    [
        Entity::IdTypeWikiData,
        'WikiData',
        'A WikiData Id',
        [],
        []
    ],
    [
        Entity::IdTypeGnd,
        'GND',
        'Gemeinsame Normdatei (GND) ',
        [],
        []
    ]
];


use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

class IdTypes implements EntityDefiner
{


    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(IdTypeDefinitions, Entity::tIdType);
    }
}