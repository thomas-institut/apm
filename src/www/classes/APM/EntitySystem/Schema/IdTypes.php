<?php

namespace APM\EntitySystem\Schema;


const IdTypeDefinitions = [

    [
        Entity::IdTypeViaf,
        'VIAF id',
        'A VIAF id',
        [],
        []
    ],
    [
        Entity::IdTypeWikiData,
        'WikiData Id',
        'A WikiData Id',
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