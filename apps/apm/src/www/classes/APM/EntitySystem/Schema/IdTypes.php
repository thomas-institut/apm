<?php

namespace APM\EntitySystem\Schema;


const IdTypeDefinitions = [

    [
        Entity::IdTypeViaf,
        'VIAF',
        'A VIAF id',
        [],
        [],
        true,
        'Use pViafId'
    ],
    [
        Entity::IdTypeWikiData,
        'WikiData',
        'A WikiData Id',
        [],
        [],
        true,
        'Use pWikiDataId'
    ],
    [
        Entity::IdTypeGnd,
        'GND',
        'Gemeinsame Normdatei (GND)',
        [],
        [],
        true,
        'Use pGND'
    ],
    [
        Entity::IdTypeOrcid,
        'ORCID',
        'ORCID iD',
        [],
        [],
        true,
        'Use pOrcid'
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

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}