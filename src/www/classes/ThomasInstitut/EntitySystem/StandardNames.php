<?php

namespace ThomasInstitut\EntitySystem;

class StandardNames
{

    const TYPE_NO_TYPE = 'NoType';
    const TYPE_ENTITY_TYPE = 'EntityType';
    const TYPE_ATTRIBUTE = 'Attribute';
    const TYPE_RELATION = 'Relation';
    const TYPE_DATA_TYPE = 'DataType';
    const TYPE_STATEMENT = 'Statement';
    const TYPE_PERSON = 'Person';
    const TYPE_PLACE = 'Place';


    const ATTRIBUTE_CREATED = 'created';
    const ATTRIBUTE_NAME = 'name';
    const ATTRIBUTE_DESCRIPTION = 'description';
    const ATTRIBUTE_ALIAS = 'alias';
    const ATTRIBUTE_TIMESTAMP = 'timestamp';


    const RELATION_IS_OF_TYPE = 'isOfType';
    const RELATION_MERGED_INTO = 'mergedInto';
    const RELATION_EDITED_BY = 'editedBy';


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