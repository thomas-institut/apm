<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;

/**
 * An EntitySystemWithMetadata is an entity system that treats statements about statements and cancellations
 * in a special way.
 *
 * Statements and cancellations are still entities in the system but because of storage efficiency concerns a
 * clear distinction is made between statements where the subject is a statement (statement metadata), statements
 * where the subject is a cancellation (cancellation metadata) and statements where the subject is any other entity
 * ("normal" statements).
 *
 * Metadata statements do not have statement ids, can be made ONLY when the statement or cancellation
 * to which they refer is made and can be retrieved ONLY in connection with "normal" statements.
 *
 */
interface EntitySystemWithMetadata extends EntitySystem
{


    /**
     * Makes a statement and returns the statement's entity id.
     *
     * Metadata is an array of predicate/object pairs:
     *
     *   [ predicate, object ]
     *
     * where object can be an entity id or a string.
     *
     * @param int $subject
     * @param int $predicate
     * @param int|string $object
     * @param array $metadata
     * @return int
     * @throws InvalidStatementException
     */
    public function makeStatementWithMetadata(int $subject, int $predicate, int|string $object, array $metadata) : int;


    /**
     * Cancels a statement. By default, after cancellation, a statement will not be reported
     * anymore.
     *
     * Returns an entity id that represents the cancellation act.
     *
     * Throws exceptions when the statement does not exist or is already cancelled
     *
     * Metadata is an array of predicate/object pairs:
     *
     *   [ predicate, object ]
     *
     * where object can be an entity id or a string.
     *
     * @param int $statementId
     * @param $metadata
     * @return int
     * @throws StatementNotFoundException
     * @throws StatementAlreadyCancelledException
     */
    public function cancelStatementWithMetadata(int $statementId, $metadata) : int;


    /**
     * Makes multiple statements and cancellations in one go.
     *
     * Implementations will try to use transaction features in the underlying data storage so that
     * all data changes will be committed at the same time.
     *
     * The input array must contain one make or cancel statement command per row with the command name
     * as the first element and the rest as the parameters:
     *
     *   [  [ 'makeStatement' , subject, predicate, object, metadata],
     *      [ 'cancelStatement', statementId, metadata] .... ]
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
     * Returns an array of 7-tuples:
     *
     *   [ statementId, subject, predicate, object, cancellationId|null, statementMetadata, cancellationMetadata ]
     *
     * where statementId, subject and predicate are entity ids, object is either an entity id or
     * a string and cancellationId is either an entityId if the subject is cancelled or null if it is not.
     *
     * statementMetadata and cancellationMetadata are arrays of predicate/object pairs that represent statements
     * where the subject is either the statement itself or the cancellation.
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
     * Finds all statements involving the given subject, predicate and object.
     * Null means any. So, for example: getStatements($entity, null, null) returns all the
     * statements in which $entity is a subject, with any predicate and any object.
     *
     * Returns an array of StatementData objects
     *
     * @param int|null $subject
     * @param int|null $predicate
     * @param string|int|null $object
     * @param bool $includeCancelled
     * @return StatementData[]
     */
    public function getStatementsData(int|null $subject, int|null $predicate, string|int|null $object, bool $includeCancelled = false) : array;

    /**
     * Returns an entity's data as an EntityData object
     *
     * @param int $entity
     * @return EntityData
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity) : EntityData;

}