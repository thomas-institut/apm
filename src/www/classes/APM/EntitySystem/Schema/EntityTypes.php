<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;
use APM\EntitySystem\Kernel\EntityTypeDefiner;


const EntityTypeDefinitions = [
    [
        Entity::tRelation,
        'Relation',
        'A predicate whose object is an entity',
        [],
        [],
        true   // isSystemType
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
        false
    ],
    [
        Entity::tPlace,
        'Place',
        'A specific geographical point, in general any point that can have a physical address or a set of GPS coordinates',
        [],
        [],
        false
    ],
    [
        Entity::tArea,
        'Area',
        'A geographical area, e.g., a country, a city, a district',
        [],
        [],
        false
    ],
    [
        Entity::tLang,
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
        false
    ],
    [
        Entity::tAreaType,
        'AreaType',
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
        false
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
}