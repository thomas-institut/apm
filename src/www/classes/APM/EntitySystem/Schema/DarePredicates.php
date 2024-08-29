<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;


const DarePredicateDef = [
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

];

class DarePredicates implements PredicateDefiner
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
       return DefsFromArray::getPredicateDefinitionsFromArray(DarePredicateDef);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}