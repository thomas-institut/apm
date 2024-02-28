<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;

/**
 * An entity system is a collection of Subject-Predicate-Object statements where subject, predicates and objects are
 * entities identified by unique ids. The object of predicates can also be literal values, i.e., strings.
 *
 * Each statement is itself an entity that can appear in other statements. This allows for statement metadata
 * (edition time, author, etc.) and multi-place predicates (e.g.  S P1 P2 ... Pn O ) systems to be easily implemented.
 *
 * Statements can be cancelled, after which, by default they will not be reported. Cancelled statements,
 * however, must not be deleted. Cancellations are also entities in the system and can therefore be the subject
 * of other statements.
 *
 * Implementations may impose constraints on the entities that can be used as subject, predicates and objects, and may
 * also check whether particular predicates requires particular entities, kinds of entities or literal values.
 *
 * Implementations may also consider reporting inferred statements from the system's data. For example, a cancellation
 * by default does not have any explicit statement, but it as an implied statement id to which it applies that could
 * be reported as a system generated statement.
 *
 * Any more complex entity system can be implemented using a minimal entity system at its core.
 *
 */
interface MinimalEntitySystem
{

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
     * Finds all statements involving the given subject, predicate and object.
     * Null means any. So, for example: getStatements($entity, null, null) returns all the
     * statements in which $entity is a subject, with any predicate and any object.
     *
     * Returns an array of 5-tuples:
     *
     *   [ statementId, subject, predicate, object, cancellationId ]
     *
     * where statementId, subject and predicate are entity ids, object is either an entity id or
     * a string and cancellationId is either an entityId if the subject is cancelled or null if it is not.
     *
     *
     * @param int|null $subject
     * @param int|null $predicate
     * @param string|int|null $object
     * @param bool $includeCancelled
     * @return array
     */
    public function getStatements(int|null $subject, int|null $predicate, string|int|null $object, bool $includeCancelled = false) : array;

    public function generateUniqueEntityId() : int;

}