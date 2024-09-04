<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;


const GeoPredicatesDef = [
    [
        'id' => Entity::pContainedBy,
        'type' => Entity::tRelation,
        'name' => 'Contained By',
        'descr' => "The geographical area that contains the entity",
        'allowedSubjectTypes' => [ Entity::tGeographicalArea, Entity::tGeographicalPlace],
        'allowedObjectTypes'=> [ Entity::tGeographicalArea],
        'reversePredicate' => Entity::pContains,
        'isPrimaryRelation' => false,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pContains,
        'type' => Entity::tRelation,
        'name' => 'Contains',
        'descr' => "An area or place that is located within the entity",
        'allowedSubjectTypes' => [ Entity::tGeographicalArea],
        'allowedObjectTypes'=> [ Entity::tGeographicalArea, Entity::tGeographicalPlace],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pCivicAddress,
        'type' => Entity::tAttribute,
        'name' => 'Civic Address',
        'descr' => "The place's civic address: number, street, city, postal code",
        'allowedSubjectTypes' => [ Entity::tGeographicalPlace],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pGpsCoordinates,
        'type' => Entity::tAttribute,
        'name' => 'GPS coordinates',
        'descr' => "A place's exact GPS coordinates",
        'allowedSubjectTypes' => [ Entity::tGeographicalPlace],
        'allowedObjectTypes'=> [ Entity::ValueTypeGpsCoordinates],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pAreaType,
        'type' => Entity::tRelation,
        'name' => 'Area type',
        'descr' => "A geographical area's type, e.g. city, country",
        'allowedSubjectTypes' => [ Entity::tGeographicalArea],
        'allowedObjectTypes'=> [ Entity::tAreaType],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
];

class GeoPredicates implements PredicateDefiner
{

    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
       return $this->getPredicateDefinitions();
    }

    /**
     * @inheritDoc
     */
    public function getPredicateDefinitions(): array
    {
       return DefsFromArray::getPredicateDefinitionsFromArray(GeoPredicatesDef);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}