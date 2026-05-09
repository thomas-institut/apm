<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;


const WorkPredicateDef = [
    [
        'id' => Entity::pWorkAuthor,
        'type' => Entity::tRelation,
        'name' => 'Work Author',
        'descr' => "The author of the work",
        'allowedSubjectTypes' => [ Entity::tWork],
        'allowedObjectTypes'=> [ Entity::tPerson],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pApmWorkId,
        'type' => Entity::tAttribute,
        'name' => 'APM/DARE Work Id',
        'descr' => "Unique system id for the work, usually an author prefix and a number, e.g., AW47",
        'allowedSubjectTypes' => [ Entity::tWork],
        'allowedObjectTypes'=> [ Entity::ValueTypeWorkId],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pWorkShortTitle,
        'type' => Entity::tAttribute,
        'name' => 'Work Short Title',
        'descr' => "A short version of the work's title in English",
        'allowedSubjectTypes' => [ Entity::tWork],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pWorkIsEnabledInApm,
        'type' => Entity::tAttribute,
        'name' => 'APM work enabled flag',
        'descr' => "If true, the work shows up in some lists in APM",
        'allowedSubjectTypes' => [ Entity::tWork],
        'allowedObjectTypes'=> [ Entity::ValueTypeBoolean],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::SystemPredicate ]
    ],
    [
        'id' => Entity::pDareRepresentedWorkId,
        'type' => Entity::tAttribute,
        'name' => 'Work Id (Dare)',
        'descr' => "Id of a work in dare.",
        'allowedSubjectTypes' => [ Entity::tRepresentation],
        'allowedObjectTypes'=> [ Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ]

];

class WorkPredicates implements PredicateDefiner
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
       return DefsFromArray::getPredicateDefinitionsFromArray(WorkPredicateDef);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}