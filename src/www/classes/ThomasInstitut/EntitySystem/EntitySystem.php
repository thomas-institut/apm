<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;

/**
 * An entity system is a collection of Subject-Predicate-Object statements where subject and predicate are
 * entities identified by a unique integer id and the object can be an entity or a literal value (a string).
 *
 * Each statement is itself an entity that can appear in other statements. This allows for statement metadata
 * (edition time, author, etc.) and multi-place predicates (e.g.  S P1 P2 ... Pn O ) systems to be easily implemented.
 *
 * Statements can be cancelled, after which, by default they will not be reported. It is up to the implementation
 * to decide whether to delete a statement after cancellation or just mark it as cancelled.
 *
 * Cancellations are also entities in the system and can therefore be the subject of other statements.
 *
 * Implementations may impose constraints on the entities that can be used as subject, predicates and objects, and may
 * also check whether particular predicates requires particular entities, kinds of entities or literal values.
 *
 * In principle, any more complex entity system can be implemented using a minimal entity system at its core, but
 * it may not be efficient when it comes to storage and data retrieval.  The value of having such a minimal system
 * is that it can be used as a prototype or to scaffold more complex systems.
 *
 */
interface EntitySystem
{

    const MakeStatementCommand = 'makeStatement';
    const CancelStatementCommand = 'cancelStatement';



    /**
     * Makes a statement and returns the statement's entity id
     *
     * @param int $subject
     * @param int $predicate
     * @param int|string $object
     * @return int
     * @throws InvalidStatementException
     */
    public function makeStatement(int $subject, int $predicate, int|string $object) : int;

    /**
     * Cancels a statement. By default, after cancellation, a statement will not be reported
     * anymore.
     *
     * Returns an entity id that represents the cancellation act.
     *
     * Throws exceptions when the statement does not exist or is already cancelled
     *
     * @param int $statementId
     * @return int
     * @throws StatementNotFoundException
     * @throws StatementAlreadyCancelledException
     */
    public function cancelStatement(int $statementId) : int;


    /**
     * Makes multiple statements and cancellations in one go.
     *
     * Implementations will try to use transaction features in the underlying data storage so that
     * all data changes will be committed at the same time.
     *
     * The input array must contain one make or cancel statement command per row with the command name
     * as the first element and the rest as the parameters:
     *
     *   [  [ 'makeStatement' , subject, predicate, object],
     *      [ 'cancelStatement', statementId] .... ]
     *
     * Returns an array with statement and cancellation Ids returned from each operation.
     *
     * If there's an error in any of the commands an exception will be thrown and if the underlying storage supports
     * transactions, data changes will be rolled back.
     *
     * @param array $statementsAndCancellations
     * @return array
     */
    public function makeMultipleStatementAndCancellations(array $statementsAndCancellations) : array;

    /**
     * Finds all statements involving the given subject, predicate and object.
     * Null means any. So, for example: getStatements($entity, null, null) returns all the
     * statements in which $entity is a subject, with any predicate and any object.
     *
     * Returns an array of 5-tuples:
     *
     *   [ statementId, subject, predicate, object, cancellationId|null ]
     *
     * where statementId, subject and predicate are entity ids, object is either an entity id or
     * a string and cancellationId is either an entityId if the subject is cancelled or null if it is not.
     *
     * If $includeCancelled is true, the system will return also cancelled statements if they are available.
     *
     * @param int|null $subject
     * @param int|null $predicate
     * @param string|int|null $object
     * @param bool $includeCancelled
     * @return array
     */
    public function getStatements(int|null $subject, int|null $predicate, string|int|null $object, bool $includeCancelled = false) : array;

    /**
     * Generates a unique id that can be used as identifier for an entity.
     * @return int
     */
    public function generateUniqueEntityId() : int;

}