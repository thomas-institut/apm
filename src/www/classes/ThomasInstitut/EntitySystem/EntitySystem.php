<?php

namespace ThomasInstitut\EntitySystem;

use Psr\Log\LoggerAwareInterface;
use ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\EntitySystem\Exception\InvalidAttributeException;
use ThomasInstitut\EntitySystem\Exception\InvalidNameException;
use ThomasInstitut\EntitySystem\Exception\InvalidObjectException;
use ThomasInstitut\EntitySystem\Exception\InvalidPredicateException;
use ThomasInstitut\EntitySystem\Exception\InvalidRelationException;
use ThomasInstitut\EntitySystem\Exception\InvalidSubjectException;
use ThomasInstitut\EntitySystem\Exception\InvalidTypeException;


/**
 * This interface describes the entity system to be used across all Thomas-Institut applications: APM, Dare, Bilderberg.
 *
 * The entity system is an abstraction that makes it easier to interface with metadata collectors and providers. It is
 * conceptually independent of how the data is actually stored and used within our applications, but a generic
 * implementation can be used to model and manipulate new data before more efficient implementations are developed.
 *
 * The fundamental principle of the entity system is that all metadata can be expressed as a list of statements
 * in the form of semantic triples:
 *
 *       [subject] [predicate] [object]  or  [subject] [predicate] 'literalValue'
 *
 *  where [subject], [predicate] and [object] are uniquely addressable entities and literalValue is a string
 *  of text.
 *
 * Entities are identified uniquely by their tids, which are 64-bit integers guaranteed to be unique if
 * generated with Tid::generateUnique().
 *
 * Two further requirements for our projects are traceability and source attribution for the data.
 * It should be possible to trace the history of statements in the system, and data editors should
 * be able to attach editorial notes, source attribution and other metadata to them. Conceptually, this is implemented 
 * by prescribing that every statement is itself an entity in the system that can, as any other entity, be the
 * subject and object of other statements. The system would then attach editor identity, edit time, sources and editorial
 * notes to these statement entities. The semantic triples become 4-tuples or quads:
 *
 *       [statementEntity] [subject] [predicate] {[object]|'literalValue'}
 *
 * In principle a complete entity system can be implemented with just three primitive methods:
 *
 *     - getUniqueTid() : Tid
 *     - storeStatement( subjectTid, predicateTid, objectTid | string, statementTid)
 *     - getStatements(subjectId | null, predicateId | null, objectTid | null, statementId | null) : array of quads
 *
 * but this will be extremely inefficient, cumbersome and error-prone. The system must provide basic management
 * of entities, predicates and data types, in addition to convenient methods to access the data.
 *
 * These are the design choices made in our system:
 *
 *   - The system distinguishes between attribute and relation statements. If the object of a statement is a literal
 *     value it is an attribute statement and its predicate is simply called 'attribute'; if the object is an entity,
 *     the statement is a relation statement and its predicate is called 'relation'.
 *
 *        Attribute statement:  [subject] [attribute] 'value' [statement1]
 *        Relation statement:  [subject] [relation] [object] [statement2]
 *
 *   - Every statement in the system is itself an entity, and, as such, may be the subject of other statements.
 *
 *   - Every statement in the system is part of exactly one statement group. Statement groups are identified by a tid, but
 *     they are not entities in the system.
 *
 *   - Statements in the system are completely specified by a 6-tuple:
 *
 *       [statement] statementGroupTid [subject] [predicate] [object] value
 *
 *     if the statement is a relation statement, object is a valid entity and value is '',
 *     if the statement is an attribute statement, object is -1
 *
 *   - A statement can be given an arbitrary number of qualifications. For example, for a given attribute value, we
 *     may want to also state its language:  [subject] [attribute] 'value' ([Language])
 *
 *     In general, this is accomplished by stating the qualifications as applying to the statement itself:
 *
 *     [s1] sg1 [subject] [predicate] [object] value
 *     [s2] sg1 [s1] [qualificationPredicate1]  [qualificationObject1] qualificationValue1
 *     [s3] sg1 [s2] [qualificationPredicate2] [qualificationObject2] qualificationValue2
 *      ...
 *     [sn] sg1 [sn] [qualificationPredicateN] [qualificationObjectN] qualificationValueN
 *
 *     The convenience methods makeQualifiedStatement and getQualifiedStatement makes it unnecessary to manually
 *     generate or read individual qualifications.
 *
 *   - All entities have textual name and description attributes by default, which can be empty depending on the
 *     entity type.
 *
 *   - All entities have a definite type, e.g., Person, Statement, Attribute, etc. All types must be registered before
 *     use. Entity types are themselves entities, but should not be manipulated directly like any other entities. Special
 *     methods are provided to deal with them.
 *
 *   - Entities of certain entity types should be identifiable also by type name and a unique textual name within the
 *     type.  For example, if entity 1698761211655 is the attribute for age, it could be identified also by
 *     'Attribute' plus 'age'. In all the system methods, when a tid is required, a string of the form 'Type:name'
 *     is normally also recognized. So, in the example, entity 1698761211655 can be identified as 'Attribute:age'
 *
 *   - The following entity types are predefined and entities of those types have unique names:  
 * 
 *         [EntityType:NoType] : null type 
 *         [EntityType:EntityType]: entity types
 *         [EntityType:Attribute]: attributes 
 *         [EntityType:Relation]: relations
 *         [EntityType:ValueType]: types for attribute values.
 *   
 *   - The following entity types are predefined, but entities of those types are not guaranteed to have unique names
 *     or any name at all:
 *     
 *          [EntityType:Statement]: statements
 *          [EntityType:Person]: normally a human being, but in general, an agent that can be an author, editor, etc.
 *          [EntityType:Place]: a definite place that can be located with a set of lat/long coordinates and that
 *             normally has a given name, for example: the Cologne Cathedral, the Thomas-Institut building.
 *          [EntityType:Area]: a geographical area, e.g. a country, a city, a university campus
 *
 *   - The following [EntityType:ValueType] entities are predefined:
 * 
 *         [ValueType:number] : a real number (i.e., double/float)
 *         [ValueType:integer],
 *         [ValueType:string],
 *         [ValueType:boolean] : true/false
 *         [ValueType:timestamp] : a Unix timestamp in seconds
 *         [ValueType:date] : a specific day, month, year
 *         [ValueType:vagueDate]: a date that may carry a certain level of vagueness or indeterminacy,
 *             for example 'c.1920', 'post 1920 ante 1930'. See the class ValueType\VagueDate for details.
 *         [ValueType:json]: a JSON string
 *         [ValueType:langCode]: a 2-3 letter code representing a language
 *
 *   - The following [EntityType:Attribute] entities are predefined and are applicable to all entities:
 *
 *         [Attribute:name]: the name of the entity (only one per entity, but can be an empty string)
 *         [Attribute:description]: a short description text (only one per entity, but can be empty)
 *         [Attribute:alias]: an alternate name for the entity
 *         [Attribute:annotation]: generally a longer text explaining something about the entity that
 *            for some reason cannot or is chosen not to be stated using attributes and relations.
 *
 *   - The [EntityType:Relation] entity [Relation:hasType] is predefined and is used to associate an entity with
 *     is type. Every entity in the system has this relation. That is, this relation is guaranteed to be
 *     reported when data for any entity is requested from the system.
 *
 *   - All statements in the system are qualified with an author and a timestamp stated with the following predicates
 *
 *          [Relation:statementAuthor]: the object must be an [EntityType:Person] entity
 *          [Attribute:statementTimestamp]: the value must be of [ValueType:timestamp]
 *
 *   - An entity that stands for the system itself is predefined: [system]. It is
 *     used as the author for all the statements concerning the predefined entities, attributes and relations
 *     described here, and may be used for other statements as well.
 *
 *   - Attribute values may be restricted to specific types, for example, [Attribute:dateOfBirth] may be restricted
 *     to be of [ValueType:date]. The relation [Relation:valueMustBeOfType] is predefined and is used to state these
 *     restrictions.
 *
 *     These and other restrictions on predicates, values and object can only be stated before they
 *     are used. They cannot be changed after use by simply stating the new conditions again because such change
 *     may imply some form of data migration that can only be assessed and executed on a case by case basis.
 *
 *   - Specific attributes and relations can be restricted to have a single value or object. For example,
 *     there can be only one current [Attribute:name] statement for every entity. This restriction is stated
 *     with the attribute [Attribute:onlyOneAllowed] (applied to the attribute entity), which has a
 *     [ValueType:boolean] value. By default, all attributes can have multiple values, with or without date and
 *     sequence qualifications.
 *
 *   - Statements cannot be deleted, but they can be cancelled, after which they will not be
 *     reported as part of entities' data. The system captures the author and timestamp of the cancellation, and this
 *     will be shown as part of the history of an entity's data. Setting a single value attribute automatically causes
 *     the current statement about it to be cancelled.
 *
 *   - Entities cannot be deleted, but can be merged into others.
 *
 *     The only two reasonable causes for deletion of an entity are:
 *        (1) the  entity does not have any attributes and is not part of any relation, which is unlikely
 *            except for entities created by mistake and untouched after creation. The system may choose to
 *            automatically delete those after some reasonable but short amount of time as part of a garbage collection
 *            process, but this is not something that a user should decide.
 *
 *        (2) the entity, entity A, is found to be a duplicate of another entity, entity B, which has more or better
 *            data. Data editors may be tempted to re-state all statements including A to B and then delete A.
 *            The problem is that after deleting A, any internal and external references to A will break.
 *
 *            The correct solution is for the system to provide a merge operation of A into B after which A's
 *            data will not be accessible and any reference to A will be directed to B.
 *
 *     The system captures the person who performed the merge, as well as the time in which it was done. After
 *     an entity is merged, the entity will not be allowed to be a subject or and object in a statement.
 *
 *     The system does not provide a method to automatically copy A's data into B's data because there might be conflicts
 *     that cannot be resolved. It is up to the applications to provide users with a way to perform correct data
 *     merges.
 *
 *     If the data for a merged entity is queried, only the following predicates will be reported:
 *
 *       [Relation:mergedInto]: the "new" entity
 *       [Relation:mergedBy]: with an [EntityType:Person] entity as its object
 *       [Attribute:mergeTimestamp]
 *       [Attribute:editorialNote]: a note left by the person who merged the entity.
 *
 *     It is up to the applications to query the data of the mergedInto entity.
 *
 *
 */
interface EntitySystem extends LoggerAwareInterface
{

    /**
     * Undefined entity
     */
    const UndefinedEntity = -1;

    /**
     * The system entity tid
     */
    const SystemEntity = 1;
    /**
     * Fundamental types
     */
    const Type_EntityType = 10;
    const Name_Type_EntityType = 'EntityType';
    const Type_Attribute = 11;
    const Name_Type_Attribute = 'Attribute';
    const Type_Relation = 12;
    const Name_Type_Relation = 'Relation';
    const Type_DataType = 13;
    const Name_Type_DataType = 'DataType';
    const Type_Statement = 14;
    const Name_Type_Statement = 'Statement';
    const Type_Person = 15;
    const Name_Type_Person = 'Person';
    const Type_Language = 16;
    const Name_Type_Language = 'Language';
    const Type_Place = 17;
    const Name_Type_Place = 'Place';
    const Type_Area = 18;
    const Name_Type_Area = 'Area';


    /**
     * Fundamental predicates
     */
    const Relation_IsOfType = 100;
    const Name_Relation_IsOfType = 'IsOfType';



    const Attribute_Name = 200;
    const Name_Attribute_Name = 'Name';
    const Attribute_Description = 201;
    const Name_Attribute_Description = 'Description';
    const Attribute_MustHaveUniqueNames = 202;
    const Name_Attribute_MustHaveUniqueNames = 'MustHaveUniqueNames';
    const Attribute_OnlyOneAllowed = 203;
    const Name_Attribute_OnlyOneAllowed = 'OnlyOneAllowed';
    const Attribute_CreationTimestamp = 204;
    const Name_Attribute_CreationTimestamp = 'CreationTimestamp';

    const Relation_StatementEditor = 301;
    const Name_Relation_StatementEditor = 'StatementEditor';
    const Attribute_StatementTimestamp = 302;
    const Name_Attribute_StatementTimestamp = 'StatementTimestamp';
    const Attribute_StatementEditorialNote = 303;
    const Name_Attribute_StatementEditorialNote = 'StatementEditorialNote';


    const Attribute_Qualification_fromDate = 401;
    const Name_Attribute_Qualification_fromDate = 'StatementQualification_fromDate';
    const Attribute_Qualification_untilDate = 402;
    const Name_Attribute_Qualification_untilDate = 'StatementQualification_untilDate';
    const Attribute_Qualification_SequenceNumber = 403;
    const Name_Attribute_Qualification_SequenceNumber = 'StatementQualification_SequenceNumber';
    const Relation_Qualification_Language = 404;
    const Name_Relation_Qualification_Language = 'StatementQualification_Language';


    const Relation_MergedInto = 501;
    const Name_Relation_MergedInto = 'MergedInto';
    const Relation_MergedBy = 502;
    const Name_Relation_MergedBy = 'MergedBy';
    const Attribute_MergeTimestamp = 503;
    const Name_Attribute_MergeTimestamp = 'MergeTimestamp';



    // Fundamental Predicates about predicates

    const Relation_SubjectTypeMustBe = 601;
    const Name_Relation_SubjectTypeMustBe = 'SubjectTypeMustBe';
    const Relation_ObjectTypeMustBe = 602;
    const Name_Relation_ObjectTypeMustBe = 'ObjectTypeMustBe';
    const Relation_ValueTypeMustBe = 603;
    const Name_Relation_ValueTypeMustBe = 'ValueTypeMustBe';

    const Relation_ReverseRelation = 604;
    const Name_Relation_Reverse = 'ReverseRelation';

    const Relation_IsReverseOf = 605;
    const Name_Relation_IsReverseOf = 'IsReverseOf';


    // Fundamental Value Types

    const ValueType_Boolean = 1001;
    const ValueType_Integer = 1002;
    const ValueType_Float = 1003;
    const ValueType_Timestamp = 1004;
    const ValueType_Date = 1005;
    const ValueType_VagueDate = 1006;
    const ValueType_TimeString = 1007;
    const ValueType_JsonString = 1008;



    const Value_Empty = '';
    const Value_True = '1';
    const Value_False = '0';

    /**
     * Creates an entity type with the given name and description
     *
     * The given type name must be unique and cannot be changed later on.
     *
     * If the parameter $uniqueNames is true, the entities of the newly created
     * type will be required to have unique names within the type.
     *
     * @param string $typeName
     * @param string $description
     * @param bool $uniqueNames
     * @param int $createdBy
     * @param int $timestamp
     * @return int
     */
    public function createEntityType(string $typeName, string $description, bool $uniqueNames, int $createdBy, int $timestamp) : int;

    /**
     * Creates an entity of the given type and returns its Tid.
     *
     * @param string|int $type
     * @param string $name
     * @param string $description
     * @param int $createdBy
     * @param int $timestamp
     * @return int
     * @throws InvalidTypeException
     * @throws InvalidNameException
     */
    public function createEntity(string|int $type, string $name = '', string $description = '', int $createdBy = -1, int $timestamp = -1) : int;

    /**
     * Makes a statement and returns a tuple with the tid of the associated statement entity and the tid of the
     * statement group to which the statement belongs:
     *
     *   [ statementTid, statementGroupTid ]
     *
     * $predicate can be a tid or a 'Attribute:attributeName' / 'Relation:relationName'  string
     *
     * $valueOrObject will be converted to the required type. If the predicate is a relation and a string is given,
     * it will be interpreted as a 'Type:name' entity identifier. If the predicate is an attribute and an integer
     * is given, it will be converted to a string
     *
     * The $statementMetadata and the $qualifications array are arrays of tuples of the form
     *
     *     [ PredicateTid_or_PredicateString , ObjectTid_or_StringValue ]
     *
     * which represent metadata or qualifications statements with the statement itself as their subject.
     *
     * $statementGroupTid is a previously generated (unique) Tid. If -1 is given a new tid will be generated.
     *
     *
     * @param int $subjectTid
     * @param string|int $predicate
     * @param string|int $valueOrObject
     * @param int $editedByPersonTid
     * @param array $statementMetadata
     * @param array $qualifications
     * @param int $statementGroupTid
     * @return int[]
     * @throws InvalidSubjectException
     * @throws InvalidPredicateException
     * @throws InvalidAttributeException
     * @throws InvalidRelationException
     * @throws InvalidObjectException
     */
    public function makeStatement(int            $subjectTid, string|int $predicate, string|int $valueOrObject,
                                           int   $editedByPersonTid,
                                           array $statementMetadata = [],
                                           array $qualifications = [],
                                           int   $statementGroupTid = -1) : array;

    /**
     * Cancels a statement.
     *
     * If the type of the statement's subject is given, the operation may be executed considerably faster, but
     * no other type will be checked, so it has to be the right one.
     *
     * @param int $statementTid
     * @param int $cancelledBy
     * @param string $cancellationNote
     * @param string|int $subjectType
     * @param int $ts the cancellation timestamp, if -1, the current time will be used
     * @return void
     */
    public function cancelStatement(int $statementTid, int $cancelledBy, string $cancellationNote, string|int $subjectType = '', int $ts = -1) : void;

//    /**
//     * Sets multiple attributes and relations for an entity.
//     *
//     * The keys of the array parameter $predicates identify the attributes and relations to
//     * set, with the corresponding value. Keys can be a mix of (numerical) tids and 'Type:name' strings.
//     *
//     * Anywhere a value or an object is required an integer, a string or an array can be used:
//     *
//     *    - an integer is taken to be a tid. If a literal value is required, the integer will be converted
//     *      to a string.
//     *    - a string is taken to be either the required literal value for an attribute or a 'Type:name' string
//     *      that identifies the object of a relation.
//     *    - an array can be:
//     *        + an associative array defining a statement with keys ['value', 'object', 'from', 'until,
//     *           'seq', 'editorialNote', 'extraStatementMetadata']
//     *        + a (normal) array with numerical keys, with each element being an associative array like the
//     *          previous case.
//     *
//     * For example:
//     *
//     *    $predicates = [
//     *       123123124123 => '1980-04-20',
//     *       123124242343 =>  'ValueType:string',
//     *      'Attribute:name' => 'Joe',
//     *      'Attribute:occupation' => [
//     *          [ 'value' => 'plumber', 'from' => 'c. 1985', 'until => '1990-06', 'seq' => 1  ],
//     *          [ 'value' => 'baker', 'from' => '1990-07', 'until => '1995-12-31', 'seq' => 2,
//     *             editorialNote: "From Joe's autobiography"  ]
//     *       ],
//     *     'Relation:hasValueType' => 'ValueType:boolean'
//     *    ];
//     *
//     * Returns the tid of the statement group that contains all the different statements.
//     *
//     * All attributes and relations must correspond to existing, pre-registered entities, and all values and
//     * objects should be valid. Otherwise, an exception will be thrown and no change will be made to the database.
//     *
//     * @param string|int $entityTid
//     * @param array $predicates
//     * @param int $editedBy
//     * @param int $ts timestamp, if -1, the current time will be used
//     * @return int
//     * @throws InvalidTypeException ,
//     * @throws InvalidAttributeException ,
//     * @throws InvalidRelationException ,
//     * @throws InvalidNameException
//     */
//    public function setEntityData(string|int $entityTid, array $predicates, int $editedBy, int $ts = -1) : int;

    /**
     * Merges an entity into another.
     * @param int $entityTid
     * @param int $intoEntityTid
     * @param int $mergedByPersonTid
     * @param string $mergeNote
     * @param int $ts the merge timestamp, if -1, the current time will be used
     * @return int
     */
    public function mergeEntities(int $entityTid, int $intoEntityTid, int $mergedByPersonTid, string $mergeNote, int $ts = -1) : int;


    /**
     *  Returns an array of StatementData objects with all statements
     *
     *
     * Providing the entity's type may greatly improve the response time, but it must be the actual
     * type of the entity or else an EntityDoesNotExistException may be thrown.
     *
     * @param string|int $entityId
     * @param string|int $entityType
     * @return StatementData[]
     * @throws EntityDoesNotExistException
     */
    public function getEntityStatements(string|int $entityId, string|int $entityType = '') : array;


    /**
     * Returns the Tid of an entity of the given type and name.
     *
     * It accepts a single parameter with a string of the form 'Type:Name'  or two
     * parameters 'Type' or typeTid and 'Name'
     *
     *
     * @param string|int $typeNameOrType
     * @param string $name
     * @return int
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     */
    public function getTidByTypeAndName(string|int $typeNameOrType, string $name = '') : int;

    /**
     * Returns name of an entity.
     *
     * Providing the entity's type may greatly improve the response time, but it must be the actual
     * type of the entity or else an EntityDoesNotExistException may be thrown.
     * @param int $entityTid
     * @param string|int $type
     * @return string
     * @throws EntityDoesNotExistException
     */
    public function getEntityName(int $entityTid, string|int $type = '') : string;

    /**
     * Returns an entity's type tid
     *
     * @param int $entityTid
     * @return int
     * @throws EntityDoesNotExistException
     */
    public function getEntityType(int $entityTid) : int;


    /**
     * Returns an array with the entity names defined within the given type
     *
     * If the type does not have unique names, throws an InvalidTypeException
     *
     * @param string|int $type
     * @return string[]
     * @throws InvalidTypeException
     */
    public function getDefinedEntityNamesForType(string|int $type) : array;

    /**
     * Returns an array with the all the valid attribute names in the system
     *
     * @return string[]
     */
    public function getValidAttributeNames() : array;

    /**
     * Returns an array with the all the valid relation names in the system
     *
     * @return string[]
     */
    public function getValidRelationNames() : array;

    /**
     * Returns an array with the all the valid entity type names in the system
     *
     * @return string[]
     */
    public function getValidEntityTypeNames() : array;


    /**
     * Returns an array with tids of all the entities in the system
     * that have the given type.
     *
     * @param string|int $type
     * @return int[]
     * @throws InvalidTypeException
     */
    public function getEntitiesOfType(string|int $type): array;
}