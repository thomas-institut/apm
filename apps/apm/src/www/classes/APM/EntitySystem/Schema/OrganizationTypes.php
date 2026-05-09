<?php

namespace APM\EntitySystem\Schema;


const OrganizationTypesDef = [
//
//    [
//        Entity::UrlTypeGeneric,
//        'Generic Url',
//        'A generic url',
//        [],
//        []
//    ],
//    [
//        Entity::UrlTypeViaf,
//        'VIAF url',
//        'An url in the VIAF website',
//        [],
//        []
//    ],
//    [
//        Entity::UrlTypeDb,
//        'DB url',
//        'An url in the DB website',
//        [],
//        []
//    ],
//    [
//        Entity::UrlTypeDnb,
//        'DNB url',
//        'An url in the DNB website',
//        [],
//        []
//    ],
//    [
//        Entity::UrlTypeWikipedia,
//        'Wikipedia url',
//        'A url in any wikipedia',
//        [],
//        []
//    ],


];


use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

class OrganizationTypes implements EntityDefiner
{


    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(OrganizationTypesDef, Entity::tOrganizationType);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}