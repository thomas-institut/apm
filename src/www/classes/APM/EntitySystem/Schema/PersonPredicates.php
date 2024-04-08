<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;


const PersonPredicateDefs = [
    [
        'tid' => Entity::pEmailAddress,
        'type' => Entity::tAttribute,
        'name' => 'Email Address',
        'descr' => "An email address that belongs to the entity",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::ValueTypeEmailAddress],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pOccupation,
        'type' => Entity::tRelation,
        'name' => 'Occupation',
        'descr' => "A person's occupation, e.g., philosopher, translator. Normally only the occupations the person is known for should be captured",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::tOccupation],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pDateOfBirth,
        'type' => Entity::tAttribute,
        'name' => 'Date of Birth',
        'descr' => "The person's date of birth",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::ValueTypeVagueDate],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pPlaceOfBirth,
        'type' => Entity::tRelation,
        'name' => 'Place of Birth',
        'descr' => "A person's place of birth",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::tArea, Entity::tPlace],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pDateOfDeath,
        'type' => Entity::tAttribute,
        'name' => 'Date of Death',
        'descr' => "The person's date of death",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::ValueTypeVagueDate],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pPlaceOfDeath,
        'type' => Entity::tRelation,
        'name' => 'Place of Death',
        'descr' => "A person's place of death",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::tArea, Entity::tPlace],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pIsUser,
        'type' => Entity::tAttribute,
        'name' => 'IsUser',
        'descr' => "True if the person is a user in the system",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::ValueTypeBoolean],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pIsEnabledUser,
        'type' => Entity::tAttribute,
        'name' => 'IsEnabledUser',
        'descr' => "True if the person is a user in the system and is enabled",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::ValueTypeBoolean],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ]
];

class PersonPredicates implements PredicateDefiner
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
       return DefsFromArray::getPredicateDefinitionsFromArray(PersonPredicateDefs);
    }
}