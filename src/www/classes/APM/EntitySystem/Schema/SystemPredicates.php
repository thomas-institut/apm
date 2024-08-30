<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;

const BasicEntityPredicateDefs = [
    [
        'id' => Entity::pEntityType,
        'type' => Entity::tRelation,
        'name' => 'Entity Type',
        'descr' => "The entity's type",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tEntityType],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::SystemPredicate]
    ],
    [
        'id' => Entity::pEntityName,
        'type' => Entity::tAttribute,
        'name' => 'Entity Name',
        'descr' => "The entity's name in Latin script",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pEntityDescription,
        'type' => Entity::tAttribute,
        'name' => 'Entity Description',
        'descr' => "A one sentence description of the entity",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pEntityCreationTimestamp,
        'type' => Entity::tAttribute,
        'name' => 'Entity Creation Timestamp',
        'descr' => "The entity's creation timestamp",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeTimestamp],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::SystemPredicate]
    ],
    [
        'id' => Entity::pSortName,
        'type' => Entity::tAttribute,
        'name' => 'Sort Name',
        'descr' => "The name to be used for sorting purposes, without diacritics and special characters",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pAlternateName,
        'type' => Entity::tAttribute,
        'name' => 'Alternate Name',
        'descr' => "An alternate name for the entity, normally qualified with a language",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'allowedQualifications' => [ Entity::pObjectLang, Entity::pObjectSequence],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],

    [
        'id' => Entity::pNameInOriginalLanguage,
        'type' => Entity::tAttribute,
        'name' => 'Name in original language',
        'descr' => "The entity's name in original language and script",
        'allowedSubjectTypes' => [ Entity::tPerson, Entity::tGeographicalPlace, Entity::tGeographicalArea, Entity::tWork],
        'allowedObjectTypes'=> null,
        'allowedQualifications' => [ Entity::pObjectLang],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pExternalId,
        'type' => Entity::tAttribute,
        'name' => 'External ID',
        'descr' => "The entity's ID in some external system, normally qualified with an ID type",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'allowedQualifications' => [ Entity::pObjectIdType, Entity::pObjectSequence],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pUrl,
        'type' => Entity::tAttribute,
        'name' => 'URL',
        'descr' => "A URL to a resource that directly and explicitly describes or represents the entity",
        'allowedSubjectTypes' => [ Entity::tPerson, Entity::tGeographicalPlace, Entity::tGeographicalArea, Entity::tWork],
        'allowedObjectTypes'=> [ Entity::ValueTypeUrl],
        'allowedQualifications' => [ Entity::pObjectUrlType, Entity::pObjectSequence],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pMember,
        'type' => Entity::tRelation,
        'name' => 'Member',
        'descr' => "A person or group that is a member of the entity",
        'allowedSubjectTypes' => [ Entity::tOrganization],
        'allowedObjectTypes'=> [ Entity::tOrganization, Entity::tPerson],
        'allowedQualifications' => [ Entity::pObjectSequence],
        'reversePredicate' => Entity::pMemberOf,
        'isPrimaryRelation' => true,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pMemberOf,
        'type' => Entity::tRelation,
        'name' => 'Member Of',
        'descr' => "An institution, or group the entity of which the entity is a member",
        'allowedSubjectTypes' => [ Entity::tOrganization, Entity::tPerson],
        'allowedObjectTypes'=> [ Entity::tOrganization],
        'allowedQualifications' => [ Entity::pObjectSequence],
        'reversePredicate' => Entity::pMember,
        'isPrimaryRelation' => false,
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pDeprecated,
        'type' => Entity::tAttribute,
        'name' => 'Deprecated',
        'descr' => "If true, the entity (normally a predicate or a type) is deprecated and should not be used any more",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeBoolean],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::SystemPredicate]
    ],

];
const StatementMetadataPredicateDefs = [
    [
        'id' => Entity::pStatementAuthor,
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
        'id' => Entity::pStatementTimestamp,
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
        'id' => Entity::pStatementEditorialNote,
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
        'id' => Entity::pObjectLang,
        'type' => Entity::tRelation,
        'name' => 'Language',
        'descr' => "The language of the statement's value",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [Entity::tLanguage],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata, PredicateFlag::QualificationPredicate ]
    ],
    [
        'id' => Entity::pObjectSequence,
        'type' => Entity::tAttribute,
        'name' => 'Sequence',
        'descr' => "A sequence number that indicates the position of the statement among statements with the same predicate",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeInteger],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata, PredicateFlag::QualificationPredicate ]
    ],
    [
        'id' => Entity::pObjectFrom,
        'type' => Entity::tAttribute,
        'name' => 'From',
        'descr' => "The date from which the statement obtains",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeVagueDate],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata, PredicateFlag::QualificationPredicate ]
    ],
    [
        'id' => Entity::pObjectUntil,
        'type' => Entity::tAttribute,
        'name' => 'Until',
        'descr' => "The date until which the statement obtains",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::ValueTypeVagueDate],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata, PredicateFlag::QualificationPredicate ]
    ],
    [
        'id' => Entity::pObjectUrlType,
        'type' => Entity::tRelation,
        'name' => 'URL Type',
        'descr' => "URL Type",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tUrlType],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata, PredicateFlag::QualificationPredicate ]
    ],
    [
        'id' => Entity::pObjectIdType,
        'type' => Entity::tRelation,
        'name' => 'ID Type',
        'descr' => "ID Type",
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> [ Entity::tIdType],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::StatementMetadata, PredicateFlag::QualificationPredicate ],
        'deprecated' => true,
        'deprecationNotice' => "Use the individual ID predicate instead"
    ],
];
const StatementCancellationPredicateDefs = [

    [
        'id' => Entity::pCancelledBy,
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
        'id' => Entity::pCancellationTimestamp,
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
        'id' => Entity::pCancellationEditorialNote,
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
        'id' => Entity::pMergedInto,
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
        'id' => Entity::pMergedBy,
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
        'id' => Entity::pMergeTimestamp,
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
        'id' => Entity::pMergeEditorialNote,
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

const IdPredicatesDefs = [
    [
        'id' => Entity::pViafId,
        'type' => Entity::tAttribute,
        'name' => 'VIAF ID',
        'descr' => 'Virtual International Authority File ID',
        'allowedSubjectTypes' => [ Entity::tPerson, Entity::tGeographicalArea, Entity::tGeographicalPlace],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pWikiDataId,
        'type' => Entity::tAttribute,
        'name' => 'WikiData ID',
        'descr' => 'WikiData ID',
        'allowedSubjectTypes' => null,
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pGNDId,
        'type' => Entity::tAttribute,
        'name' => 'GND ID',
        'descr' => "Gemeinsame Normdatei ID",
        'allowedSubjectTypes' => [ Entity::tPerson, Entity::tGeographicalArea, Entity::tGeographicalPlace],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pLocId,
        'type' => Entity::tAttribute,
        'name' => 'LoC ID',
        'descr' => "US Library of Congress ID",
        'allowedSubjectTypes' => [ Entity::tPerson, Entity::tGeographicalArea, Entity::tGeographicalPlace],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ],
];

const LanguagePredicateDefs = [
    [
        'id' => Entity::pLangIso639Code,
        'type' => Entity::tAttribute,
        'name' => 'ISO 639 Code',
        'descr' => "A language's 2 or 3 letter code defined in the ISO 639 standard",
        'allowedSubjectTypes' => [ Entity::tLanguage],
        'allowedObjectTypes'=> null,
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => [ PredicateFlag::SystemPredicate ]
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
            StatementQualificationPredicateDefs,
            IdPredicatesDefs,
            LanguagePredicateDefs,
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

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }


}