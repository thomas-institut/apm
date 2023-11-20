<?php

namespace ThomasInstitut\EntitySystem;

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
 * In principle a complete system can be implemented with just three primitive methods:
 *
 *     - getUniqueTid() : Tid
 *     - storeStatement( subjectTid, predicateTid, objectTid | string, statementTid)
 *     - getStatements(subjectId | null, predicateId | null, objectTid | null, statementId | null) : array of quads
 *
 * but it will be extremely inefficient, cumbersome and error-prone. The system must provide basic management
 * of entities, predicates and data types, in addition to convenient methods to access the data.
 *
 * These are the design choices made in our system:
 *
 *   - The system distinguishes between attribute and relation statements. If the object of a statement is a literal
 *     value it is an attribute statement and its predicate is simply called 'attribute'; if the object is an entity,
 *     the statement is a relation statement and its predicate is called 'relation'.
 *
 *        Attribute statement:  [subject] [attribute]  'value' [statement1]
 *        Relation statement:  [subject] [relation] [object] [statement2]
 *
 *   - A statement may be qualified with a date period (from and to dates). This makes it easy to state data
 *     like:
 *
 *          [s1] [Averroes] [wrote] [SomeWork] from '1150' until '1151'
 *
 *     Without this mechanism, such a common statement would have to be expressed by several statements. For example:
 *
 *         [s1] [Averroes] [isTheAuthorOf] [QualifiedAuthorshipStatement1]
 *         [s2] [QualifiedAuthorshipStatement1] [isAbout] [SomeWork]
 *         [s3] [QualifiedAuthorshipStatement1] [fromDate] '1150'
 *         [s4] [QualifiedAuthorshipStatement1] [untilDate] '1151'
 *
 *     This, however, is only one of the ways in which this can be captured, which makes it problematic to leave
 *     it to a user's will. With the built-in mechanism, editors must not assume any particular way of unpacking
 *     qualified statements. Attribute or relation qualifications are just parts of the statement itself.
 *
 *   - A statement may be qualified also with a sequence number to make it easier to work with ordered attributes
 *     and relations. For example:
 *
 *        [s1] [Manuscript1] [hasWork] [SomeWork] seq 1
 *        [s2] [Manuscript1] [hasWork] [OtherWork] seq 2
 *
 *   - A relation may be qualified with a referredAs label, representing the way the object is referenced in the context
 *     in which the statement is valid. For example, in a manuscript description, a person may be referred by
 *     a name different from their "official" name in the database:
 *
 *     [s1] [Manuscript2] [hasScribe] [PetrusScribanus] referredAs 'Petrus'
 *
 *   - Statements may be qualified with any combination of dates, sequences and labels :
 *
 *          [s1] [Averroes] [wrote] [SomeWork] from '1150' until '1151' seq 1 referredAs 'The first work'
 *          [s2] [Averroes] [wrote] [OtherWork] from '1152' until '1152' seq 2 referredAs 'The other work'
 *
 *     Taking into account qualifications, statement quads in the system become 8-tuples when fully qualified:
 *
 *        [statementEntity] [subject] [predicate] [object]|'value' 'fromDate' 'untilDate' sequenceNumber referredAs
 *
 *   - All entities have textual name and description attributes by default, which can be empty depending on the
 *     entity type.
 *
 *   - All entities have a definite type, e.g., Person, Statement, Attribute, etc. All types must be registered before
 *     use.
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
 *          [EntityType:StatementGroup]: set of [EntityType:Statement] entities that for some reason go together, 
 *             for example, because all the corresponding statements were made in the same editing operation.
 *          [EntityType:Person]: normally a human being, but in general, an agent that can be an author, editor, etc.
 *          [EntityType:Place]: a definite place that can be located with a set of lat/long coordinates and that
 *             normally has a given name, for example: the Cologne Cathedral, the Thomas-Institut building.
 *          [EntityType:GeographicalArea]: a geographical area, e.g. a country, a city, a university campus 
 *
 *   - The following [EntityType:ValueType] entities are predefined:
 * 
 *         [ValueType:number] : a real number (i.e., double/float)
 *         [ValueType:integer], [ValueType:string], [ValueType:boolean]
 *         [ValueType:timestamp] : a Unix timestamp in seconds
 *         [ValueType:exactDate] : a specific day, month, year
 *         [ValueType:date]: a date that may carry a certain level of vagueness or indeterminacy, 
 *             for example 'c.1920', 'post 1920 ante 1930'. See the class ThomasInstitut\ValueType\Date for details.
 *         [ValueType:json]: a JSON string

 *   - The following [EntityType:Attribute] entities are predefined and are applicable to all entities:
 *
 *         [Attribute:name]: the name of the entity (only one per entity, but can be an empty string)
 *         [Attribute:description]: a short description text (only one per entity, but can be empty)
 *         [Attribute:alias]: an alternate name for the entity
 *         [Attribute:annotation]: generally a longer text explaining something about the entity that
 *            for some reason cannot or is chosen not to be stated using attributes and relations.
 * 
 *   - The [EntityType:Relation] entity [Relation:isOfType] is predefined and is used to associate an entity with 
 *     is type. Every entity in the system has this relation, that is, this relation is guaranteed to be
 *     reported when data for any entity is requested from the system.
 *
 *   - All statements in the system have an author and a timestamp stated with the following predicates
 *
 *          [Relation:editedBy]: the object must be an [EntityType:Person] entity
 *          [Attribute:editTimestamp]: the value must be of [ValueType:timestamp]
 *
 *   - An [EntityType:Person] entity that stands for the system itself is predefined: [system]. It is
 *     used as the author for all the statements concerning the predefined entities, attributes and relations
 *     described here, and may be used for other statements as well.

 *   - Attribute values may be restricted to specific types, for example, [Attribute:dateOfBirth] may be restricted
 *     to be of [ValueType:date]. The relation [Relation:valueMustBeOfType] is predefined and is used to state these
 *     restrictions.
 *
 *     These and other restrictions on predicates, values and object can only be stated before they
 *     are used. They can be changed after use, but normally this will require some form of migration of the data
 *     that must be developed, tested and deployed case by case.
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
 *     The only two reasonable causes for deletion of an entity are:
 *        (1) the  entity does not have any attributes and is not part of any relation, which is unlikely
 *            except for entities created by mistake and untouched after creation. The system may choose to
 *            automatically delete those after some reasonable but short amount of time as part of a garbage collection
 *            process, but this is not something that a user should decide.
 *
 *        (2) the entity, entity A, is found to be a duplicate of another entity, entity B, which has more or better
 *            data. Data editors may be tempted to change all relations including A to B and then delete A.
 *            Not only this is prone to errors (relations may be overlooked), but also any external
 *            references to A will break if A is deleted.
 *            The correct solution is for the system to provide a merge operation of A into B: the predicates of A
 *            not present in B are copied to B, and all subsequent references to A are redirected to B.
 *
 *     The system captures the person who performed the merge, as well as the time in which it was done. After
 *     an entity is merged, the entity will not be allowed to be a subject or and object in a statement. If the data
 *     for that entity is queried, only the following predicates will be reported:
 *
 *       [Attribute:isMerged]: with the value 'true'
 *       [Relation:mergedInto]: the "new" entity
 *       [Relation:mergedBy]: with an [EntityType:Person] entity as its object
 *       [Attribute:mergeTimestamp]
 *       [Attribute:editorialNote]: a note left by the person who merged the entity.
 *
 *
 */
interface EntitySystem
{

    /**
     * The system entity tid
     */
    const SYSTEM = 1;

    /**
     * Fundamental predicates
     */
    const RELATION__HAS_TYPE = 10;
    const ATTRIBUTE__NAME = 20;
    const ATTRIBUTE__DESCRIPTION = 21;

    /**
     * The entity type EntityType
     */
    const ENTITY_TYPE__ENTITY_TYPE = 101;

    /**
     * Creates an entity of the given type and returns its Tid.
     *
     * @param string|int $type
     * @param string $name
     * @param string $description
     * @return int
     * @throws InvalidTypeException
     * @throws InvalidNameException
     */
    public function createEntity(string|int $type, string $name = '', string $description = '') : int;

    /**
     * Makes a statement and returns the Tid of the associated statement entity.
     *
     * $predicate can be a tid of a 'Attribute:attributeName' / 'Relation:relationName'  string
     *
     * $valueOrObject will be converted to the required type. If the predicate is a relation and a string is given,
     * it will be interpreted as a 'Type:name' entity identifier. If the predicate is an attribute and an integer
     * is given, it will be converted to a string
     *
     * The $qualifications array can include 'dateFrom', 'dateUntil', 'seq' and 'referredAs' properties.
     *
     * The statement can be accompanied by data about the statement itself, for example, a
     * source attribution, a consultation date, etc., with the parameter $extraStatementMetadata, which is of the form:
     *   [  attribute|relation => value|object ]
     * where attribute|relation can be a Tid, 'Attribute:attrName' or 'Relation:relationName'
     *
     * An optional statement group tid can be given, it needs to be a EntityType:StatementGroup entity previously
     * created with createEntity
     *
     *
     * @param int $subjectTid
     * @param string|int $predicate
     * @param string|int $valueOrObject
     * @param array $qualifications
     * @param int $editedByPersonTid
     * @param string $editorialNote
     * @param array $extraStatementMetadata
     * @param int $statementGroupTid
     * @param int $ts the statement's timestamp, if -1, the current time will be used
     * @return int
     * @throws InvalidSubjectException
     * @throws InvalidPredicateException
     * @throws InvalidAttributeException
     * @throws InvalidRelationException
     * @throws InvalidObjectException
     */
    public function makeStatement(int  $subjectTid, string|int $predicate, string|int $valueOrObject,
                                           array $qualifications,
                                           int   $editedByPersonTid,
                                           string $editorialNote,
                                           array $extraStatementMetadata = [],
                                           int $statementGroupTid = -1,
                                           int $ts = -1 ) : int;

    /**
     * Cancels a statement.
     *
     * @param int $statementTid
     * @param int $cancelledByPersonTid
     * @param int $ts the cancellation timestamp, if -1, the current time will be used
     * @return void
     */
    public function cancelStatement(int $statementTid, int $cancelledByPersonTid, int $ts = -1) : void;

    /**
     * Sets multiple attributes and relations for an entity.
     *
     * The keys of the array parameter $predicates identify the attributes and relations to
     * set, with the corresponding value. Keys can be a mix of (numerical) tids and 'Type:name' strings.
     *
     * Anywhere a value or an object is required an integer, a string or an array can be used:
     *
     *    - an integer is taken to be a tid. If a literal value is required, the integer will be converted
     *      to a string.
     *    - a string is taken to be either the required literal value for an attribute or a 'Type:name' string
     *      that identifies the object of a relation.
     *    - an array can be:
     *        + an associative array defining a statement with keys ['value', 'object', 'from', 'until,
     *           'seq', 'editorialNote', 'extraStatementMetadata']
     *        + a (normal) array with numerical keys, with each element being an associative array like the
     *          previous case.
     *
     * For example:
     * 
     *    $predicates = [
     *       123123124123 => '1980-04-20',
     *       123124242343 =>  'ValueType:string',
     *      'Attribute:name' => 'Joe',
     *      'Attribute:occupation' => [
     *          [ 'value' => 'plumber', 'from' => 'c. 1985', 'until => '1990-06', 'seq' => 1  ],
     *          [ 'value' => 'baker', 'from' => '1990-07', 'until => '1995-12-31', 'seq' => 2,
     *             editorialNote: "From Joe's autobiography"  ]
     *       ],
     *     'Relation:hasValueType' => 'ValueType:boolean'
     *    ];
     *
     * Returns the tid of the statement group that contains all the different statements.
     *
     * All attributes and relations must correspond to existing, pre-registered entities, and all values and
     * objects should be valid. Otherwise, an exception will be thrown and no change will be made to the database.
     *
     * @param string|int $entityTid
     * @param array $predicates
     * @param int $editedBy
     * @param int $ts timestamp, if -1, the current time will be used
     * @return int
     * @throws InvalidTypeException ,
     * @throws InvalidAttributeException ,
     * @throws InvalidRelationException ,
     * @throws InvalidNameException
     */
    public function setEntityData(string|int $entityTid, array $predicates, int $editedBy, int $ts = -1) : int;

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
     *  Returns an array of arrays representing the current statements where the given entity is referenced as
     *  subject or object.  Each element in the returning array is of the form:
     *
     *   [
     *     'tid' => statementTid,
     *
     *     'subject' => subjectTid,
     *     'predicate' => predicateTid,
     *     'predicateType' =>  'Attribute' | 'Relation'
     *     'predicateName' => 'attrName' | 'relationName'
     *
     *     'object' => objectTid | -1 // for relations
     *     'value' => 'literalValue'  // for attributes
     *
     *     // qualifications, only the ones actually present in the statement
     *     'from' => 'fromDate',
     *     'until' => 'untilDate',
     *     'seq' => sequenceNumber
     *     'referredAs'  =>  'someLabel'
     *
     *     'editedBy' => editorTid
     *     'editTimestamp' => statementTimestamp
     *     'editorialNote' => 'someNote'
     *   ]
     *
     * Providing the entity's type may greatly improve the response time, but it must be the actual
     * type of the entity or else an EntityDoesNotExistException may be thrown.
     *
     * @param string|int $entityId
     * @param string|int $entityType
     * @return array
     * @throws EntityDoesNotExistException
     */
    public function getEntityStatements(string|int $entityId, string|int $entityType = '') : array;


    /**
     * Returns the Tid of an entity of the given type and name.
     *
     * It accepts a single parameter with a string of the form 'Type:Name'  or two
     * parameters 'Type' and 'Name'
     *
     * Returns -1 if the type is invalid, the type is not one that has entities with unique names or
     * there's no entity with the given type and name.
     *
     * @param string $typeNameOrType
     * @param string $name
     * @return int
     */
    public function getTidByTypeName(string $typeNameOrType, string $name = '') : int;

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


}