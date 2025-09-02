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
        'allowedSubjectTypes' => [ Entity::tGeographicalArea, Entity::tGeographicalPlace, Entity::tCity, Entity::tInstitution],
        'allowedObjectTypes'=> [ Entity::tGeographicalArea, Entity::tCountry, Entity::tCity],
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
        'allowedSubjectTypes' => [ Entity::tGeographicalArea, Entity::tCountry, Entity::tCity],
        'allowedObjectTypes'=> [ Entity::tGeographicalArea, Entity::tGeographicalPlace, Entity::tCity, Entity::tInstitution],
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
    [
        'id' => Entity::pLocatedIn,
        'type' => Entity::tRelation,
        'name' => 'LocatedIn',
        'descr' => "A city or an institution that is located in a city or country",
        'allowedSubjectTypes' => [ Entity::tCity, Entity::tInstitution ],
        'allowedObjectTypes'=> [ Entity::tCountry, Entity::tCity, Entity::tGeographicalArea ],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareCountryCode,
        'type' => Entity::tAttribute,
        'name' => 'Dare Country Code',
        'descr' => "Encodes a country name in Dare.",
        'allowedSubjectTypes' => [Entity::tCountry],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [],
    ],
    [
        'id' => Entity::pDareCityCode,
        'type' => Entity::tAttribute,
        'name' => 'Dare City Code',
        'descr' => "Encodes a city name in Dare.",
        'allowedSubjectTypes' => [Entity::tCity],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [],
    ],
    [
        'id' => Entity::pDareInstCode,
        'type' => Entity::tAttribute,
        'name' => 'Dare Institution Code',
        'descr' => "Encodes an institution name in Dare.",
        'allowedSubjectTypes' => [Entity::tInstitution],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [],
    ],
    [
        'id' => Entity::pDareLongInstCode,
        'type' => Entity::tAttribute,
        'name' => 'Dare Long Institution Code (Country-City-Institution)',
        'descr' => "Uniquely encodes an institution name in Dare.",
        'allowedSubjectTypes' => [Entity::tInstitution],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [],
    ],
    [
        'id' => Entity::pDareLongCityCode,
        'type' => Entity::tAttribute,
        'name' => 'Dare Long City Code (Country-City))',
        'descr' => "Uniquely encodes a city name in Dare.",
        'allowedSubjectTypes' => [Entity::tCity],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [],
    ],
    [
        'id' => Entity::pDareRepositoryId,
        'type' => Entity::tAttribute,
        'name' => 'Repository/Institution ID (Dare)',
        'descr' => "Describes the id of a repository in the dare db.",
        'allowedSubjectTypes' => [Entity::tInstitution],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [],
    ]
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