<?php

namespace APM\System\EntitySystem;

use ThomasInstitut\EntitySystem\EntityData;
use ThomasInstitut\EntitySystem\EntitySystemWithMetadata;/**
 * This interface describes the entity system used in APM. It is a basically a EntitySystemWithMetadata
 * with a predefined set of predicates and entities and constraints and requirement for metadata.
 *
 *   - Entity ids are Tids and are normally generated with Tid::generateUnique. System entities, however,
 *     have manually generated ids with values under 10000.
 *
 *   - System entities cannot be subjects in normal statements. All data about system entities is predefined
 *     and cannot be modified by normal methods.
 *
 *   - Only predefined predicates are allowed in statements. Furthermore, a distinction is made between
 *     relations and attributes. A relation is a predicate whose object is an entity, and an attribute is
 *     a predicate whose object is a literal value. The system will enforce the correct object.
 *
 *   - All entities have a definite type, e.g., Person, Statement, Attribute, etc. Types are system entities,
  *    are assigned to entities at creation time and cannot be changed afterward.
 *
 *   - All entities have one single textual name.
 *
 *   - The following entity types are predefined:
 *
 *         [EntityType:Attribute]: attributes
 *         [EntityType:Relation]: relations
 *         [EntityType:ValueType]: types for attribute values.
 *         [EntityType:Statement]: statements
 *         [EntityType:Cancellation]: a statement cancellations
 *         [EntityType:Person]: normally a human being, but in general, an agent that can be an author, editor, etc.
 *         [EntityType:Place]: a definite place that can be located with a set of lat/long coordinates and that
 *             normally has a given name, for example: the Cologne Cathedral, the Thomas-Institut building.
 *         [EntityType:Area]: a geographical area, e.g. a country, a city, a university campus
 *         [EntityType:Language]: a language
 *
 *   - The following [ValueType] entities are predefined and no new ones can be created using normal entity creation methods:
 *
 *         [ValueType:number] : a real number (i.e., double/float)
 *         [ValueType:integer],
 *         [ValueType:string]: the default for attributes
 *         [ValueType:boolean] : true/false, expressed as '1' and '0'
 *         [ValueType:timestamp] : a Unix timestamp in seconds
 *         [ValueType:date] : a specific day, month, year
 *         [ValueType:vagueDate]: a date that may carry a certain level of vagueness or indeterminacy,
 *             for example 'c.1920', 'post 1920 ante 1930'. See the class ValueType\VagueDate for details.
 *         [ValueType:json]: a JSON string
 *
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
 *   - The following predicates are used exclusively for statement metadata:
 *
 *          [Relation:statementAuthor]: the object must be an [EntityType:Person] entity (required)
 *          [Attribute:statementTimestamp]: the value must be of [ValueType:timestamp] (required)
 *          [Attribute:statementEditorialNote]: a textual note to the statement
 *
 *   - An entity that stands for the system itself is predefined: [system]. It is
 *     used as the author for all the statements concerning the predefined entities, attributes and relations
 *     described here, and may be used for other statements as well. These "system" statements, however, are
 *     mostly inferred from constants in the code, not stored in the normal statement storages.
 *
 *   - Attribute values may be restricted to specific types, for example, [Attribute:dateOfBirth] may be restricted
 *     to be of [ValueType:date]. The relation [Relation:valueMustBeOfType] is predefined and is used to state these
 *     restrictions.
 *
 *   - Specific attributes and relations can be restricted to have a single value or object. For example,
 *     there can be only one current [Attribute:name] statement for every entity.
 *
 *   - Entities cannot be deleted, but can be merged into others.
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
interface ApmEntitySystemInterface
{

    const ValueFalse = '0';
    const ValueTrue = '1';

    const SystemEntity = 1;

    /**
     * Creates an entity of the given type, name and description.
     *
     * @param int $entityType
     * @param string $name
     * @param int $authorTid
     * @param string $description
     * @param int $ts
     * @return int
     * @throws InvalidEntityTypeException
     */
    public function createEntity(int $entityType, string $name, string $description, int $authorTid, int $ts = -1): int;

    /**
     * Returns entity data for the given entity
     * @param int $entity
     * @return EntityData
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity) : EntityData;


    /**
     * Returns an entity's type
     * @param int $entity
     * @return int
     * @throws EntityDoesNotExistException
     */
    public function getEntityType(int $entity) : int;


    /**
     * Makes a statement
     *
     * @param int $subject
     * @param int $predicate
     * @param int|string $object
     * @param int $author
     * @param string $editorialNote
     * @param array $extraMetadata
     * @param int $ts
     * @return int
     */
    public function makeStatement(int $subject, int $predicate, int|string $object, int $author,
                                  string $editorialNote = '', array $extraMetadata = [], int $ts = -1) : int;

    /**
     * Cancels a statement
     * @param int $statementId
     * @param int $author
     * @param int $ts
     * @param string $editorialNote
     * @return int
     * @throws StatementNotFoundException
     * @throws StatementAlreadyCancelledException
     * @throws PredicateCannotBeCancelledException
 */
    public function cancelStatement(int $statementId, int $author, int $ts = -1, string $editorialNote = '') : int;


    /**
     * Merges an entity into another
     *
     * @param int $entity
     * @param int $mergeInto
     * @param int $author
     * @param string $editorialNote
     * @param int $ts
     * @return void
     * @throws EntityDoesNotExistException
     * @throws EntityAlreadyMergedException
     */
    public function mergeEntity(int $entity, int $mergeInto, int $author, string $editorialNote, int $ts = -1) : void;

    /**
     * Returns all the entities in the system for the given type.
     *
     * By default, merged entities are not returned.
     *
     * @param int $type
     * @param bool $includeMerged
     * @return int[]
     */
    public function getAllEntitiesForType(int $type, bool $includeMerged = false) : array;

}