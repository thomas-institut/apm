<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;


const LegacyDatabaseIdPredicatesDefinitions = [
    [
        'id' => Entity::pDarePersonId,
        'type' => Entity::tAttribute,
        'name' => 'DARE person id',
        'descr' => "Row id in DARE's person_normalised table",
        'allowedSubjectTypes' => [ Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::ValueTypeInteger],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => [ PredicateFlag::SystemPredicate]
    ],
    [
        'id' => Entity::pLegacyApmDatabaseId,
        'type' => Entity::tAttribute,
        'name' => 'Legacy APM Database Id',
        'descr' => "Original row id in one of APM's legacy database tables",
        'allowedSubjectTypes' => [ Entity::tDocument, Entity::tGenericEditionSource], // more will be added as legacy entity types are moved to the entity system
        'allowedObjectTypes'=> [ Entity::ValueTypeInteger],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::SystemPredicate]
    ],

];

class LegacyDatabaseIdPredicates implements PredicateDefiner
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
       return DefsFromArray::getPredicateDefinitionsFromArray(LegacyDatabaseIdPredicatesDefinitions);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}