<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;


const GeoPredicatesDef = [
    [
        'tid' => Entity::pContainedBy,
        'type' => Entity::tRelation,
        'name' => 'Contained By',
        'descr' => "The geographical area that contains the entity",
        'allowedSubjectTypes' => [ Entity::tArea, Entity::tPlace],
        'allowedObjectTypes'=> [ Entity::tArea],
        'reversePredicate' => Entity::pContains,
        'isPrimaryRelation' => false,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pContains,
        'type' => Entity::tRelation,
        'name' => 'Contains',
        'descr' => "An area or place that is located within the entity",
        'allowedSubjectTypes' => [ Entity::tArea],
        'allowedObjectTypes'=> [ Entity::tArea, Entity::tPlace],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pCivicAddress,
        'type' => Entity::tAttribute,
        'name' => 'Civic Address',
        'descr' => "The place's civic address: number, street, city, postal code",
        'allowedSubjectTypes' => [ Entity::tPlace],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pGpsCoordinates,
        'type' => Entity::tAttribute,
        'name' => 'GPS coordinates',
        'descr' => "A place's exact GPS coordinates",
        'allowedSubjectTypes' => [ Entity::tPlace],
        'allowedObjectTypes'=> [ Entity::ValueTypeGpsCoordinates],
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
}