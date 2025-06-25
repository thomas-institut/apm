<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityTypeDefiner;


const EntityTypeDefinitions = [
    [
        Entity::tRelation,
        'Relation',
        'A predicate whose object is an entity',
        [], // translated names
        [], // translated descriptions
        true   // isSystemType: if true, all entities of this type are defined in PHP code
    ],
    [
        Entity::tAttribute,
        'Attribute',
        'A predicate whose object is a literal value',
        [ 'es' => 'Atributo'],
        [ 'es' => 'Un predicated cuyo objeto es un valor literal'],
        true
    ],
    [
        Entity::tEntityType,
        'Entity Type',
        'An class of entities',
        [],
        [],
        true
    ],
    [
        Entity::tValueType,
        'Value Type',
        'A type of literal value, e.g, date, timestamp, etc',
        [],
        [],
        true
    ],
    [
        Entity::tStatement,
        'Statement',
        'A statement',
        [],
        [],
        true
    ],
    [
        Entity::tStatementGroup,
        'Statement Group',
        'A group of statements',
        [],
        [],
        true
    ],
    [
        Entity::tPerson,
        'Person',
        'A person',
        [],
        [],
        false  // not a system type
    ],
    [
        Entity::tGeographicalPlace,
        'Place',
        'A specific geographical point, in general any point that can have a physical address or a set of GPS coordinates',
        [],
        [],
        false  // not a system type
    ],
    [
        Entity::tGeographicalArea,
        'Area',
        'A geographical area, e.g., a country, a city, a district',
        [],
        [],
        false  // not a system type
    ],
    [
        Entity::tLanguage,
        'Language',
        'A human language, e.g. German, French',
        [],
        [],
        true
    ],
    [
        Entity::tUrlType,
        'Url Type',
        'An url type, e.g., Wikipedia, Deutsche Bibliothek, etc',
        [],
        [],
        true
    ],
    [
        Entity::tIdType,
        'Id Type',
        'An id type such as WikiData, VIAF',
        [],
        [],
        true
    ],
    [
        Entity::tWork,
        'Work',
        'A work, such as a book, edition, article, etc',
        [],
        [],
        false  // not a system type
    ],
    [
        Entity::tAreaType,
        'Area Type',
        'An area type, e.g., country, province, state, district',
        [],
        [],
        true
    ],
    [
        Entity::tOrganization,
        'Organization',
        'A group of people or other organizations',
        [],
        [],
        false  // not a system type
    ],
    [
        Entity::tOrganizationType,
        'Organization Type',
        'A type of organization, e.g., company, university, federation',
        [],
        [],
        true
    ],
    [
        Entity::tOccupation,
        'Occupation',
        "A person's occupation, e.g., philosopher, translator",
        [],
        [],
        true
    ],
    [
        Entity::tOrganizationalRole,
        'Organizational Role',
        "A person or organization's role within an organization, e.g., employee, student, director, department, board, faculty",
        [],
        [],
        true
    ],
    [
        Entity::tCalendar,
        'Calendar',
        "A calendar, e.g. Gregorian, Julian, etc.",
        [],
        [],
        true
    ],
    [
        Entity::tDocument,
        'Document',
        "A collection of pages bound or grouped together as a single object, e.g., a manuscript, a print, an incunabulum, etc",
        [],
        [],
        false // not a system type
    ],
    [
        Entity::tGenericEditionSource,
        'Generic Edition Source',
        "An entity that can be used as a source/witness in an edition when a more specific entity (e.g. a work or a manuscript) is defined",
        [],
        [],
        false // not a system type
    ],
    [
        Entity::tDocumentType,
        'Document Type',
        "A type of document, e.g., manuscript, print, etc",
        [],
        [],
        true
    ],
    [
        Entity::tImageSource,
        'Image Source',
        "A pre-defined source for document images",
        [],
        [],
        true
    ],
    [
        Entity::tPageType,
        'Page Type',
        "A page's type, e.g., front matter, back matter, text",
        [],
        [],
        true
    ],
    [
        Entity::tCountry,
        'Country',
        "A country, e.g., Germany",
        [],
        [],
        false
    ],
    [
        Entity::tCity,
        'City',
        "A city, e.g., Berlin",
        [],
        [],
        false
    ],
    [
        Entity::tInstitution,
        'Institution',
        "An institution, e.g., Berliner Staatsbibliothek",
        [],
        [],
        false
    ],
    [
        Entity::tDareMaterial,
        'Document Material (Dare)',
        "A material, e.g., paper",
        [],
        [],
        false
    ],
];

class EntityTypes implements EntityTypeDefiner
{

   /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return $this->getEntityTypeDefinitions();
    }

    /**
     * @inheritDoc
     */
    public function getEntityTypeDefinitions(): array
    {
        return DefsFromArray::getEntityTypeDefinitionsFromArray(EntityTypeDefinitions);
    }
    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}