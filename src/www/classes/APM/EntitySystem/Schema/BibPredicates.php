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
        'descr' => "The id of a bibliographical entry",
        'allowedSubjectTypes' => [Entity::tBibEntry],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pBibObjectType,
        'type' => Entity::tAttribute,
        'name' => 'Bibliographical Object Type (Dare)',
        'descr' => "The type of a bibliographical object described in a bib entry, e. g. a book or an article.",
        'allowedSubjectTypes' => [Entity::tBibEntry],
        'allowedObjectTypes'=> [Entity::tBibObject],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDareBookSectionEntryId,
        'type' => Entity::tAttribute,
        'name' => 'Book Section Id (Dare)',
        'descr' => 'The id of a bib entry describing a book section.',
        'allowedSubjectTypes' => [Entity::tBibEntry],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rPublishedIn,
        'type' => Entity::tRelation,
        'name' => 'Published In',
        'descr' => 'The bib object in which the bib object, e. g. a book section or an article is published.',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tBibObject],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::pPages,
        'type' => Entity::tAttribute,
        'name' => 'Pages',
        'descr' => 'The pages of a bib object.',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pPublisher,
        'type' => Entity::tAttribute,
        'name' => 'Publisher',
        'descr' => 'The publisher  of a bib object.',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tPublisher],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pPubPlace,
        'type' => Entity::tAttribute,
        'name' => 'Place of Publication',
        'descr' => 'Place where a bib object was published.',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tCity],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],

    [
        'id' => Entity::pDareBookEntryId,
        'type' => Entity::tAttribute,
        'name' => 'Book Id (DARE)',
        'descr' => 'The id of a book entry in dare.',
        'allowedSubjectTypes' => [Entity::tBibEntry],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pSeries,
        'type' => Entity::tAttribute,
        'name' => 'Series',
        'descr' => 'Series in which the work was published.',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tBibObject],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pEdition,
        'type' => Entity::tAttribute,
        'name' => 'Edition',
        'descr' => 'Edition statement (e.g., 2nd rev. ed.).',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::ValueTypeText],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],

    [
        'id' => Entity::pDareArticleEntryId,
        'type' => Entity::tAttribute,
        'name' => 'Article Id (DARE)',
        'descr' => 'The id of an article entry in dare.',
        'allowedSubjectTypes' => [Entity::tBibEntry],
        'allowedObjectTypes'=> [Entity::ValueTypeInteger],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pIssue,
        'type' => Entity::tAttribute,
        'name' => 'Issue',
        'descr' => 'Issue no. of a bib object, e. g. a journal.',
        'allowedSubjectTypes' => [Entity::tBibObject],
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
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tBibObject],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rReprintIn,
        'type' => Entity::tRelation,
        'name' => 'Is Reprinted In',
        'descr' => 'The bib object is reprinted in the referenced bib object.',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tBibObject],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ],
    [
        'id' => Entity::rRepresents,
        'type' => Entity::tRelation,
        'name' => 'Represents',
        'descr' => 'A representation object represents the referenced bibliographical entry.',
        'reversePredicate' => Entity::rIsRepresentedBy,
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tBibObject],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::rIsRepresentedBy,
        'type' => Entity::tRelation,
        'name' => 'Is Represented By',
        'descr' => 'This bibliographical entry is represented by the referenced representation object(s).',
        'allowedSubjectTypes' => [Entity::tBibObject],
        'allowedObjectTypes'=> [Entity::tBibObject],
        'allowedQualifications' => [],
        'canBeCancelled' => true,
        'singleProperty' => false,
        'flags' => []
    ]
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
