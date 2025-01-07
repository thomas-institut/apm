<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;


const EditionSourcePredicateDefs = [
    [
        'id' => Entity::pDefaultSiglum,
        'type' => Entity::tAttribute,
        'name' => 'Default Siglum',
        'descr' => "Siglum to use as default when the source is added to an editions",
        'allowedSubjectTypes' => [ Entity::tWork, Entity::tDocument, Entity::tGenericEditionSource],
        'allowedObjectTypes'=> [ Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pApplicableLanguage,
        'type' => Entity::tRelation,
        'name' => "Applicable Language",
        'descr' => "An edition's language in which a generic source can be used",
        'allowedSubjectTypes' => [ Entity::tGenericEditionSource],
        'allowedObjectTypes'=> [ Entity::tLanguage],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pApplicableWork,
        'type' => Entity::tRelation,
        'name' => 'Applicable Work',
        'descr' => "An edition's work in which a generic source can be used",
        'allowedSubjectTypes' => [ Entity::tGenericEditionSource],
        'allowedObjectTypes'=> [ Entity::tWork],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pSpecificSource,
        'type' => Entity::tRelation,
        'name' => 'Specific Source',
        'descr' => "The actual specific source (work, document) to which the generic source refers." .
            "When set, the generic source is effectively deprecated in favour of the specific source.",
        'allowedSubjectTypes' => [ Entity::tGenericEditionSource],
        'allowedObjectTypes'=> [ Entity::tWork, Entity::tDocument],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ],
];

class EditionSourcePredicates implements PredicateDefiner
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
       return DefsFromArray::getPredicateDefinitionsFromArray(EditionSourcePredicateDefs);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}