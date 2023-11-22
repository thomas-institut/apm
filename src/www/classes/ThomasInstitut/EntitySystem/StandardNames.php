<?php

namespace ThomasInstitut\EntitySystem;

class StandardNames
{

    const TYPE_ENTITY_TYPE = 'EntityType';
    const TYPE_ATTRIBUTE = 'Attribute';
    const TYPE_RELATION = 'Relation';
    const TYPE_DATA_TYPE = 'DataType';
    const TYPE_STATEMENT = 'Statement';
    const TYPE_STATEMENT_GROUP = 'StatementGroup';
    const TYPE_PERSON = 'Person';
    const TYPE_PLACE = 'Place';
    const TYPE_AREA = 'Area';

    const ATTRIBUTE_NAME = 'name';
    const ATTRIBUTE_DESCRIPTION = 'description';
    const ATTRIBUTE_ALIAS = 'alias';
    const ATTRIBUTE_HAS_UNIQUE_NAMES = 'hasUniqueNames';

    const ATTRIBUTE_ANNOTATION = 'annotation';
    const ATTRIBUTE_EDIT_TIMESTAMP = 'editTimestamp';
    const ATTRIBUTE_EDITORIAL_NOTE = 'editorialNote';
    const ATTRIBUTE_IS_MERGED = 'isMerged';
    const ATTRIBUTE_MERGE_TIMESTAMP = 'mergeTimestamp';



    const RELATION_HAS_TYPE = 'hasType';

    const RELATION_EDITED_BY = 'editedBy';
    const RELATION_MERGED_INTO = 'mergedInto';
    const RELATION_MERGED_BY = 'mergedBy';


    const DATATYPE_STRING = 'string';
    const DATATYPE_INT = 'int';
    const DATATYPE_NUMBER = 'number';
    const DATATYPE_TIMESTAMP = 'timestamp';
    const DATATYPE_BOOLEAN = 'boolean';
    const DATATYPE_DATE = 'date';
    const DATATYPE_JSON = 'json';

    const VALUE_TRUE = '1';
    const VALUE_FALSE = '0';
}