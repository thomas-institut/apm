<?php

namespace APM\EntitySystem\Schema;


const UrlTypeDefinition = [

    [
        Entity::UrlTypeGeneric,
        'Generic',
        'A generic url',
        [],
        []
    ],
    [
        Entity::UrlTypeViaf,
        'VIAF',
        'An url in the VIAF website',
        [],
        []
    ],
    [
        Entity::UrlTypeDb,
        'DB',
        'An url in the Deutsche Bibliothek website',
        [],
        []
    ],
    [
        Entity::UrlTypeDnb,
        'DNB',
        'An url in the DNB website',
        [],
        []
    ],
    [
        Entity::UrlTypeWikipedia,
        'Wikipedia',
        'A url in any wikipedia',
        [],
        []
    ],
    [
        Entity::UrlTypePersonalHomePage,
        'Personal Home Page',
        'A home page hosted privately',
        [],
        []
    ],
    [
        Entity::UrlTypeWorkHomePage,
        'Work Home Page',
        'A home page hosted by an employer or institution',
        [],
        []
    ],


];


use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

class UrlTypes implements EntityDefiner
{


    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(UrlTypeDefinition, Entity::tUrlType);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}