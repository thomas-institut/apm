<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;

const BasicEntityPredicateDefs = [
    [
        'tid' => Entity::pEntityType,
        'type' => Entity::tRelation,
        'name' => 'EntityType',
        'descr' => 'Defines the entity type for an Entity',
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tEntityType],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pEntityName,
        'type' => Entity::tAttribute,
        'name' => 'Entity Name',
        'descr' => "Defines the entity's name",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pEntityDescription,
        'type' => Entity::tAttribute,
        'name' => 'Entity Descriptions',
        'descr' => "Describes the entity",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pEntityCreationTimestamp,
        'type' => Entity::tAttribute,
        'name' => 'Entity Creation Timestamp',
        'descr' => "The entity's creation timestamp",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeTimestamp],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pSortName,
        'type' => Entity::tAttribute,
        'name' => 'Sort Name',
        'descr' => "The name to be used for sort purposes",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'tid' => Entity::pAlias,
        'type' => Entity::tAttribute,
        'name' => 'Alias',
        'descr' => "An alternate name for the entity, normally qualified with a language",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],

    [
        'tid' => Entity::pNameInOriginalLanguage,
        'type' => Entity::tAttribute,
        'name' => 'Name in original language',
        'descr' => "The entity's name in original language and script",
        'allowedSubjectTypes' => [ Entity::tPerson, Entity::tPlace, Entity::tArea, Entity::tWork],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pExternalId,
        'type' => Entity::tAttribute,
        'name' => 'External Id',
        'descr' => "The entity's id in some external system, normally qualified with an IdType",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pUrl,
        'type' => Entity::tAttribute,
        'name' => 'URL',
        'descr' => "A URL to a resource that directly and explicitly describes or represents the entity, e.g. a Wikipedia entry",
        'allowedSubjectTypes' => [ Entity::tPerson, Entity::tPlace, Entity::tArea, Entity::tWork],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pMember,
        'type' => Entity::tRelation,
        'name' => 'Member',
        'descr' => "A person or group that is a member of the entity",
        'allowedSubjectTypes' => [ Entity::tOrganization],
        'allowedObjectTypes'=> [ Entity::tOrganization, Entity::tPerson],
        'reversePredicate' => Entity::pMemberOf,
        'isPrimaryRelation' => true,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'tid' => Entity::pMemberOf,
        'type' => Entity::tRelation,
        'name' => 'Member Of',
        'descr' => "An institution, or group the entity of which the entity is a member",
        'allowedSubjectTypes' => [ Entity::tOrganization, Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::tOrganization],
        'reversePredicate' => Entity::pMember,
        'isPrimaryRelation' => false,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],

];
const StatementMetadataPredicateDefs = [
    [
        'tid' => Entity::pStatementAuthor,
        'type' => Entity::tRelation,
        'name' => 'Statement Author',
        'descr' => "The author of a statement",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tPerson],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
    [
        'tid' => Entity::pStatementTimestamp,
        'type' => Entity::tAttribute,
        'name' => 'Statement Timestamp',
        'descr' => "The timestamp of a statement",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeTimestamp],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
    [
        'tid' => Entity::pStatementEditorialNote,
        'type' => Entity::tAttribute,
        'name' => 'Statement Editorial Note',
        'descr' => "An editorial note attached to a statement",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ]
];
const StatementQualificationPredicateDefs = [
    [
        'tid' => Entity::pStLang,
        'type' => Entity::tRelation,
        'name' => 'Language Statement Qualification',
        'descr' => "The language of the statement's object",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tLang],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
    [
        'tid' => Entity::pStSeq,
        'type' => Entity::tAttribute,
        'name' => 'Sequence Statement Qualification',
        'descr' => "A sequence number that indicates the position of the statement among statements of the same kind",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeInteger],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
    [
        'tid' => Entity::pStFrom,
        'type' => Entity::tAttribute,
        'name' => 'Date From Statement Qualification',
        'descr' => "The date from which the statement obtains",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeVagueDate],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
    [
        'tid' => Entity::pStUntil,
        'type' => Entity::tAttribute,
        'name' => 'Date Until Statement Qualification',
        'descr' => "The date until which the statement obtains",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeVagueDate],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
    [
        'tid' => Entity::pStUrlType,
        'type' => Entity::tRelation,
        'name' => 'Url Type Statement Qualification',
        'descr' => "If the object of the statement is a URL, the URL type",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tUrlType],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
    [
        'tid' => Entity::pStIdType,
        'type' => Entity::tRelation,
        'name' => 'ID Type Statement Qualification',
        'descr' => "If the object of the statement is an id, the id type",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tIdType],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata ]
    ],
];
const StatementCancellationPredicateDefs = [

    [
        'tid' => Entity::pCancelledBy,
        'type' => Entity::tRelation,
        'name' => 'Cancelled By',
        'descr' => "The author of a statement cancellation",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tPerson],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::CancellationPredicate ]
    ],
    [
        'tid' => Entity::pCancellationTimestamp,
        'type' => Entity::tAttribute,
        'name' => 'Cancellation Timestamp',
        'descr' => "The timestamp of a statement cancellation",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeTimestamp],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::CancellationPredicate ]
    ],
    [
        'tid' => Entity::pCancellationEditorialNote,
        'type' => Entity::tAttribute,
        'name' => 'Cancellation Editorial Note',
        'descr' => "An editorial note attached to a statement cancellation",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::CancellationPredicate ]
    ],
];
const MergePredicateDefs = [
    [
        'tid' => Entity::pMergedInto,
        'type' => Entity::tRelation,
        'name' => 'Merged Into',
        'descr' => "The entity into which the subject is merged",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::MergePredicate ]
    ],
    [
        'tid' => Entity::pMergedBy,
        'type' => Entity::tRelation,
        'name' => 'Merged By',
        'descr' => "The author of a merge",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tPerson],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::MergePredicate ]
    ],
    [
        'tid' => Entity::pMergeTimestamp,
        'type' => Entity::tAttribute,
        'name' => 'Merge Timestamp',
        'descr' => "The timestamp of a merge",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeTimestamp],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::MergePredicate ]
    ],
    [
        'tid' => Entity::pMergeEditorialNote,
        'type' => Entity::tAttribute,
        'name' => 'Merge Editorial Note',
        'descr' => "An editorial note attached to a merge",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::MergePredicate ]
    ]
];


class SystemPredicates implements PredicateDefiner
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
        $defArrays = [
            BasicEntityPredicateDefs,
            MergePredicateDefs,
            StatementCancellationPredicateDefs,
            StatementMetadataPredicateDefs,
            StatementQualificationPredicateDefs
        ];

        $totalDefs = [];
        foreach($defArrays as $defArray) {
            $defs = DefsFromArray::getPredicateDefinitionsFromArray($defArray);
            foreach($defs as $def) {
                $totalDefs[] = $def;
            }
        }
        return $totalDefs;
    }


}