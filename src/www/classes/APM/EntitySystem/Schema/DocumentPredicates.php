<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\PredicateDefiner;
use APM\EntitySystem\Kernel\PredicateFlag;


const DocumentPredicateDefs = [
    [
        'id' => Entity::pDocumentType,
        'type' => Entity::tRelation,
        'name' => 'Document Type',
        'descr' => "The document's type: mss, print, etc",
        'allowedSubjectTypes' => [ Entity::tDocument],
        'allowedObjectTypes'=> [ Entity::tDocumentType],
        'canBeCancelled' => false,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pDocumentLanguage,
        'type' => Entity::tRelation,
        'name' => 'Document Language',
        'descr' => "The document's main language",
        'allowedSubjectTypes' => [ Entity::tDocument],
        'allowedObjectTypes'=> [ Entity::tLanguage],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pImageSource,
        'type' => Entity::tRelation,
        'name' => 'Image Source',
        'descr' => "The document's image source",
        'allowedSubjectTypes' => [ Entity::tDocument],
        'allowedObjectTypes'=> [ Entity::tImageSource],
        'canBeCancelled' => true, // if not present, no images will be displayed for the document
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pInDare,
        'type' => Entity::tAttribute,
        'name' => 'Defined in DARE',
        'descr' => "If true, the document is defined in DARE",
        'allowedSubjectTypes' => [ Entity::tDocument],
        'allowedObjectTypes'=> [ Entity::ValueTypeBoolean],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pIsPublic,
        'type' => Entity::tAttribute,
        'name' => 'Public Document',
        'descr' => "If true, the document is public (Legacy attribute: not used in APM anymore)",
        'allowedSubjectTypes' => [ Entity::tDocument],
        'allowedObjectTypes'=> [ Entity::ValueTypeBoolean],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],
    [
        'id' => Entity::pImageSourceData,
        'type' => Entity::tAttribute,
        'name' => 'Image Source Data',
        'descr' => "Data needed to identify the document's images on the image source",
        'allowedSubjectTypes' => [ Entity::tDocument],
        'allowedObjectTypes'=> [ Entity::ValueTypeText],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => [ ]
    ],
    [
        'id' => Entity::pUseDeepZoomForImages,
        'type' => Entity::tAttribute,
        'name' => 'Use Deep Zoom for Images',
        'descr' => "If true, the images will be presented with deep zoom",
        'allowedSubjectTypes' => [ Entity::tDocument],
        'allowedObjectTypes'=> [ Entity::ValueTypeBoolean],
        'canBeCancelled' => true,
        'singleProperty' => true,
        'flags' => []
    ],

];

class DocumentPredicates implements PredicateDefiner
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
       return DefsFromArray::getPredicateDefinitionsFromArray(DocumentPredicateDefs);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}