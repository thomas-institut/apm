<?php

namespace ThomasInstitut\EntitySystem;

/**
 * This interface describes the entity system to be used across all Thomas-Institut applications: APM, Dare, Bilderberg.
 *
 * The entity system is an abstraction that makes it easier to interface with metadata collectors and providers. It is
 * conceptually independent of how the data is actually stored and used within the applications, but
 * can be used to model and manipulate new data before more efficient implementations are devised.
 *
 * The fundamental principle of the entity system is that all metadata can be expressed as a list of statements
 * in the form of semantic triples:
 *
 *       [subject] [predicate] [object]  or  [subject] [predicate] 'literalValue'
 *
 *  where [subject], [predicate] and [object] are uniquely addressable entities and literalValue is a string
 *  of text.
 *
 * Entities are identified uniquely by their Tids, which are 64-bit integers guaranteed to be unique if
 * generated with Tid::generateUnique().
 *
 *  In most cases, APM also captures data about the statements themselves. For example, the transcription of a
 *  column of a manuscript page has an associated transcriber and a timestamp.  For general manuscript descriptions
 *  APM may also capture editorial notes, dating information and source attributions for the different statements.
 *  Conceptually, this is implemented by prescribing that every statement is itself an entity in the system that
 *  can, as any other entity, be the subject and object of statements. The semantic triples become 4-tuples or quads:
 *
 *       [subject] [predicate] {[object]|'literalValue'} [statementEntity]
 *
 * In principle a complete system can be implemented with just three primitive methods:
 *
 *     - getUniqueTid() : Tid
 *     - storeStatement( subjectTid, predicateTid, objectTid | string, statementTid)
 *     - getStatements(subjectId | null, predicateId | null, objectTid | null, statementId | null) : array of quads
 *
 * This, however, will be extremely inefficient, cumbersome and error-prone. The system must provide basic management
 * of entities, predicates and data types, in addition to convenient methods to access the data.
 *
 * In particular,
 *
 *   - The system distinguishes between attribute and relation statements. If the object of a statement is a literal
 *     value it is an attribute statement and is predicate is simply called attribute; if the object is an entity,
 *     the statement is a relation statement and its predicate is a relation.
 *
 *        Attribute statement:  [subject] [attribute]  'value' [s1]
 *        Relation statement:  [subject] [relation] [object] [s2]
 *
 *   - A statement may be qualified with a date period (from and to dates). This makes it easy to state data
 *     like:
 *
 *          [Averroes] [wrote] [SomeWork] from '1150' until '1151'  [s1]
 *
 *     Without this mechanism, such a common statement would have to be expressed by several statements. For example:
 *
 *         [Averroes] [wrote] [QualifiedStatement1]  [s1]
 *         [QualifiedStatement1] [statementObject] [SomeWork] [s2]
 *         [QualifiedStatement1] [fromDate] '1150' [s3]
 *         [QualifiedStatement1] [untilDate] '1151'  [s4]
 *
 *     This is, however, only one of the ways in which this can be captured, which makes it problematic to leave
 *     it to a user's will. With the built-in mechanism must not assume any particular way of unpacking qualified
 *     statements.
 *
 *   - A statement may be qualified also with a sequence number. This makes it easy to work with ordered attributes
 *     and relations. For example:
 *
 *       [Manuscript1] [hasWork] [SomeWork] seq 1 [s1]
 *       [Manuscript1] [hasWork] [OtherWork] seq 2 [s2]
 *
 *   - Statements may be qualified with both dates and sequences:
 *
 *          [Averroes] [wrote] [SomeWork] from '1150' until '1151' seq 1 [s1]
 *          [Averroes] [wrote] [OtherWork] from '1152' until '1152' seq 2 [s2]
 *
 *   - All entities have textual name and description attributes by default, which can be empty depending on the
 *     entity type.
 *
 *   - All entities have a definite type, e.g., Person, Statement, Attribute, etc. All types must be registered before
 *     use. The relation [isOfType] associates an entity to its type.
 *
 *   - Entities of certain entity types should be identifiable also by type name and a unique textual name within the
 *     type.  For example, if entity 1698761211655 is the attribute for age, it could be identified also by
 *     'Attribute':'age'.  The name is not meant to change once its entity is created, but it is not guaranteed to
 *     be immutable. Users must not hardcode them in their code, but use global or class constants to deal with them.
 *
 *   - The entity types [NoType], [EntityType], [Attribute], [Relation] and [DataType] are predefined and are
 *     identifiable by type+unique-name
 *
 *   - The entity type [Statement] is predefined. Only entities of this type are allowed to be used as the statement
 *     component of a semantic quad.
 *
 *   - The following DataType entities are predefined with their normal meanings:
 *
 *          [number], [integer], [string], [boolean], [timestamp], [date], [json]
 *
 *   - The following Attribute entities are predefined:
 *
 *         [name], [description], [alias], [timestamp]
 *
 *   - The following Relation entities are predefined:
 *         [isOfType], [mergedInto], [editedBy]
 *
 *   - The entity types Person and Place should be predefined
 *
 *   - A Person entity that stands for the system itself is predefined: [system]
 *
 *   - All statements in the system have an author and a timestamp. The author must be a Person entity and
 *     the timestamp a 'DataType':'timestamp' value.
 *
 *   - Specific attributes and relations may be restricted to specific entity types. The attributes [name] and
 *     [description] must be applicable to all entity types.
 *
 *   - Attribute and relation values may be restricted to specific data types:
 *       [name] and [description] must be 'DataType':'string'
 *
 *   - Specific attributes and relations can be restricted to have a single value (e.g., there can be only one date of
 *     birth for a person), multiple unordered values (e.g., a person can have several aliases with no specific order
 *     between them) or multiple ordered values (e.g., a person can have multiple works ordered by some cataloguing system).
 *       [name] and [description] must have a single value
 *       [alias] can have multiple unordered values
 *
 *   - Statements cannot be deleted, but they can be cancelled, after which they will not be
 *     reported as part of entities' data. The system captures the author and timestamp of the cancellation.
 *
 *   - Entities must not be manually deleted, but can be merged into others.
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
 *            The correct solution is for the system to provide a merge operation of A into B: the attributes of A
 *            not present in B are copied to B, and all subsequent references to A are redirected to B.
 *
 *
 *
 */
interface EntitySystem
{
    /**
     * Creates an entity of the given type and returns its Tid.
     *
     * @param string $type
     * @param string $name
     * @param string $description
     * @return int
     * @throws InvalidTypeException
     * @throws InvalidNameException
     */
    public function createEntity(string $type, string $name = '', string $description = '') : int;

    /**
     * Makes an attribution statement and returns the Tid of the associated statement entity.
     *
     * The $qualifications array can include 'dateFrom', 'dateUntil' and 'seq' properties
     *
     * @param int $subjectTid
     * @param string|int $attribute  the name of the attribute or its Tid
     * @param string $value
     * @param array $qualifications
     * @param int $editedByPersonTid
     * @param int $ts  the statement's timestamp, if -1, the current time will be used
     * @return int
     * @throws InvalidAttributeException
     */
    public function makeAttributeStatement(int $subjectTid, string|int $attribute, string $value,
                                           array $qualifications,
                                           int $editedByPersonTid, string $statementNote = '', int $ts = -1 ) : int;

    /**
     * Makes a relation statement and returns the Tid of the associated statement entity.
     *
     * The $qualifications array can include 'dateFrom', 'dateUntil' and 'seq' properties
     *
     * @param int $subjectTid
     * @param string|int $relation  the name of the relation or its Tid
     * @param int $objectTid
     * @param array $qualifications
     * @param int $editedByPersonTid
     * @param int $ts the statement's timestamp, if -1, the current time will be used
     * @return int
     * @throws InvalidRelationException
     */
    public function makeRelationStatement(int $subjectTid, string|int $relation, int $objectTid,
                                          array $qualifications,
                                          int $editedByPersonTid,   string $statementNote = '', int $ts = -1) : int;

    /**
     * Cancels a statement.
     * @param int $statementTid
     * @param int $cancelledByPersonTid
     * @param int $ts the cancellation timestamp, if -1, the current time will be used
     * @return void
     */
    public function cancelStatement(int $statementTid, int $cancelledByPersonTid, int $ts = -1) : void;

    /**
     * Merges an entity into another.
     * @param int $entityTid
     * @param int $intoEntityTid
     * @param int $mergedByPersonTid
     * @param int $ts the merge timestamp, if -1, the current time will be used
     * @return int
     */
    public function mergeEntities(int $entityTid, int $intoEntityTid, int $mergedByPersonTid, int $ts = -1) : int;


    /**
     * Returns all data in the system for the given entity.
     * Providing the entity's type may greatly improve the response time, but it must be the actual
     * type of the entity or else an EntityDoesNotExistException may be thrown.
     * @param int $entityTid
     * @param string|int $type
     * @return EntityData
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entityTid, string|int $type = '') : EntityData;


    /**
     * Returns the Tid of an entity of the given type and name.
     * Returns -1 if the type is invalid, the type is not one that has entities with unique names or
     * there's no entity with the given type and name.
     * @param string|int $type
     * @param string $name
     * @return int
     */
    public function getEntityTidByTypeAndName(string|int $type, string $name) : int;

    /**
     * Returns name of an entity.
     * Providing the entity's type may greatly improve the response time, but it must be the actual
     * type of the entity or else an EntityDoesNotExistException may be thrown.
     * @param int $entityTid
     * @param string|int $type
     * @return string
     * @throws EntityDoesNotExistException
     */
    public function getEntityName(int $entityTid, string|int $type = '') : string;


}