<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;


const BibPredicateDefs = [
    [
        'id' => Entity::pDareBibEntryId,
        'type' => Entity::tAttribute,
        'name' => 'Bibliographical Entry Id (Dare)',
        'descr' => "The id of a bibliographical object",
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareId,
        'type' => Entity::tAttribute,
        'name' => 'Dare Id (Dare)',
        'descr' => "The dare id of a bibliographical object",
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rContainedIn,
        'type' => Entity::tRelation,
        'name' => 'Contained In',
        'descr' => 'The book, journal or series in which the bib object is contained.',
        'reversePredicate' => Entity::rContains,
        'allowedSubjectTypes' => [Entity::tBookSection, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::tBook, Entity::tJournal, Entity::tBookSeries],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rContains,
        'type' => Entity::tRelation,
        'name' => 'Contains Bib Object',
        'descr' => 'A book, book section or an article which is contained in the bib object.',
        'reversePredicate' => Entity::rContainedIn,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tJournal, Entity::tBookSeries],
        'allowedObjectTypes'=> [Entity::tBookSection, Entity::tArticle],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pPages,
        'type' => Entity::tAttribute,
        'name' => 'Pages',
        'descr' => 'The page numbers of a book section or an article.',
        'allowedSubjectTypes' => [Entity::tBookSection, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rPublishedBy,
        'type' => Entity::tRelation,
        'name' => 'PublishedBy',
        'descr' => 'The publisher of a book or a series.',
        'reversePredicate' => Entity::rPublishes,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSeries],
        'allowedObjectTypes'=> [Entity::tPublisher],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rPublishes,
        'type' => Entity::tRelation,
        'name' => 'Publishes',
        'descr' => 'A published bib object.',
        'reversePredicate' => Entity::rPublishedBy,
        'allowedSubjectTypes' => [Entity::tPublisher],
        'allowedObjectTypes'=> [Entity::tBook, Entity::tBookSeries],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rPubPlace,
        'type' => Entity::tRelation,
        'name' => 'Place of Publication',
        'descr' => 'The city where a book was published.',
        'allowedSubjectTypes' => [Entity::tBook],
        'allowedObjectTypes'=> [Entity::tCity],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pPubPlace,
        'type' => Entity::tAttribute,
        'name' => 'Place of Publication',
        'descr' => 'The place where a book was published, which could not yet be identified as a city entity.',
        'allowedSubjectTypes' => [Entity::tBook],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pEdition,
        'type' => Entity::tAttribute,
        'name' => 'Edition',
        'descr' => 'An edition statement, e.g., 2nd rev. ed.',
        'allowedSubjectTypes' => [Entity::tBook],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pContainerIssue,
        'type' => Entity::tAttribute,
        'name' => 'Issue',
        'descr' => 'The issue no. of a journal.',
        'allowedSubjectTypes' => [Entity::tArticle],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rReprintOf,
        'type' => Entity::tRelation,
        'name' => 'Is Reprint Of',
        'descr' => 'The bib object is a reprint of the referenced bib object.',
        'reversePredicate' => Entity::rReprintIn,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::tBook, Entity::tBookSection, Entity::tArticle],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rReprintIn,
        'type' => Entity::tRelation,
        'name' => 'Is Reprinted In',
        'reversePredicate' => Entity::rReprintOf,
        'descr' => 'The bib object is reprinted in the referenced bib object.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::tBook, Entity::tBookSection, Entity::tArticle],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rRepresents,
        'type' => Entity::tRelation,
        'name' => 'Represents',
        'descr' => 'The represented work, e.g. by a translation or edition.',
        'reversePredicate' => Entity::rIsRepresentedBy,
        'allowedSubjectTypes' => [Entity::tRepresentation],
        'allowedObjectTypes'=> [Entity::tWork],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rIsRepresentedBy,
        'type' => Entity::tRelation,
        'name' => 'Is Represented By',
        'descr' => 'The work(s), which is represented by a e.g. a translation.',
        'reversePredicate' => Entity::rRepresents,
        'allowedSubjectTypes' => [Entity::tWork],
        'allowedObjectTypes'=> [Entity::tRepresentation],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rWitnessOf,
        'type' => Entity::tRelation,
        'name' => 'Is Witness Of',
        'descr' => 'The representation witnessed by the bib object.',
        'reversePredicate' => Entity::rWitnessedBy,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::tRepresentation],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rWitnessedBy,
        'type' => Entity::tRelation,
        'name' => 'Is Witnessed By',
        'descr' => 'A bib object which witnesses the representation.',
        'reversePredicate' => Entity::rWitnessOf,
        'allowedSubjectTypes' => [Entity::tRepresentation],
        'allowedObjectTypes'=> [Entity::tBook, Entity::tBookSection, Entity::tArticle],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pDareCatalogId,
        'type' => Entity::tAttribute,
        'name' => 'Catalog Id (Dare)',
        'descr' => 'The catalog id of a catalog entry in dare.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOnlineCatalog, Entity::tOldCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pTitle,
        'type' => Entity::tAttribute,
        'name' => 'Title',
        'descr' => 'The title of a bib object, e. g. a book.',
        'allowedSubjectTypes' => [
            Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pPublicationDate,
        'type' => Entity::tAttribute,
        'name' => 'Publication Date',
        'descr' => 'The publication date of a bib object, e. g. a book.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pBibObjectLang,
        'type' => Entity::tRelation,
        'name' => 'Language',
        'descr' => 'The language of a bib object, e. g. an article.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::tLanguage],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pRepresentationLang,
        'type' => Entity::tRelation,
        'name' => 'Language',
        'descr' => 'The language of a representation, e. g. a translation.',
        'allowedSubjectTypes' => [Entity::tRepresentation],
        'allowedObjectTypes'=> [Entity::tLanguage],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pTag,
        'type' => Entity::tAttribute,
        'name' => 'Tag',
        'descr' => 'Describes the topic of a bib object, e. g. a book.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pTransliteratedTitle,
        'type' => Entity::tAttribute,
        'name' => 'Transliterated Title',
        'descr' => 'The transliterated title of a bib object.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pTranslatedTitle,
        'type' => Entity::tAttribute,
        'name' => 'Translated Title',
        'descr' => 'A translation of the title of a bib object.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pShortTitle,
        'type' => Entity::tAttribute,
        'name' => 'Short Title',
        'descr' => 'The short title of a bib object.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rAuthoredBy,
        'type' => Entity::tRelation,
        'name' => 'Authored by',
        'descr' => 'The author of a bib object.',
        'reversePredicate' => Entity::rAuthorOf,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::tPerson, Entity::tInstitution],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rTranslatedBy,
        'type' => Entity::tRelation,
        'name' => 'Translated by',
        'descr' => 'The translator of a bib object or a representation.',
        'reversePredicate' => Entity::rTranslatorOf,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tRepresentation],
        'allowedObjectTypes'=> [Entity::tPerson, Entity::tInstitution],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rEditedBy,
        'type' => Entity::tRelation,
        'name' => 'Edited by',
        'descr' => 'The editor of a bib object or a representation.',
        'reversePredicate' => Entity::rEditorOf,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tJournal, Entity::tRepresentation],
        'allowedObjectTypes'=> [Entity::tPerson, Entity::tInstitution],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pContainerVolume,
        'type' => Entity::tAttribute,
        'name' => 'Volume',
        'descr' => 'The volume of a bib object, e. g. a journal.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tArticle],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareBibEntryVolume,
        'type' => Entity::tAttribute,
        'name' => 'Volume (Dare Bib Entry)',
        'descr' => 'The volume of a bib object in the dare bib entry table.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pAbstract,
        'type' => Entity::tAttribute,
        'name' => 'Abstract',
        'descr' => 'An abstract describing the content of a bib object.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDoi,
        'type' => Entity::tAttribute,
        'name' => 'DOI',
        'descr' => 'The doi of a bib object.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareIsCatalog,
        'type' => Entity::tAttribute,
        'name' => 'Is Catalog (Dare)',
        'descr' => 'Whether the bib object is marked as a catalog in the dare db.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeBoolean],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareInBibliography,
        'type' => Entity::tAttribute,
        'name' => 'In Bibliography (Dare)',
        'descr' => 'Whether the bib object is in the dare bibliography.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeBoolean],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareIsInactive,
        'type' => Entity::tAttribute,
        'name' => 'Is Inactive (Dare)',
        'descr' => 'Whether the bib object is inactive in dare.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeBoolean],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareReprintType,
        'type' => Entity::tAttribute,
        'name' => 'Reprint Type (Dare)',
        'descr' => 'The reprint type of the bib object in dare, bib or inc.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rDareReviewedBy,
        'type' => Entity::tRelation,
        'name' => 'Reviewed By (Dare)',
        'descr' => 'The reviewer of the bib object in dare, qualified by from/until timestamps.',
        'reversePredicate' => Entity::rDareReviewerOf,
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::tPerson],
        'allowedQualifications' => [Entity::pDareReviewValidFrom, Entity::pDareReviewValidUntil],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pDareReviewValidFrom,
        'type' => Entity::tAttribute,
        'name' => 'Review Valid From (Dare)',
        'descr' => 'The timestamp designating the date of a review of a bib object in dare.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [PredicateFlag::StatementMetadata]
    ],
    [
        'id' => Entity::pDareReviewValidUntil,
        'type' => Entity::tAttribute,
        'name' => 'Reviewed Valid Until (Dare)',
        'descr' => 'The timestamp designating the revision of a bib object in dare.',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [PredicateFlag::StatementMetadata]
    ],
    [
        'id' => Entity::pDareRepresentationSet,
        'type' => Entity::tAttribute,
        'name' => 'Unknown Representation Set Data (Dare)',
        'descr' => 'Whether the representation of a bib object is set.',
        'allowedSubjectTypes' => [Entity::tRepresentation],
        'allowedObjectTypes'=> [Entity::ValueTypeBoolean],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pRepresentationType,
        'type' => Entity::tAttribute,
        'name' => 'Representation Type',
        'descr' => 'The type of the representation of a work, e.g. translation or edition.',
        'allowedSubjectTypes' => [Entity::tRepresentation],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareEntryType,
        'type' => Entity::tAttribute,
        'name' => 'Bib Entry Type (Dare)',
        'descr' => 'The type of a bib entry in the dare database (bib_entry table), usually "bibliography" or "reference".',
        'allowedSubjectTypes' => [Entity::tBook, Entity::tBookSection, Entity::tArticle, Entity::tOldCatalog, Entity::tOnlineCatalog],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
];

class BibPredicates implements PredicateDefiner
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
       return DefsFromArray::getPredicateDefinitionsFromArray(BibPredicateDefs);
    }
    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}
