<?php

namespace ThomasInstitut\EntitySystem;

use Psr\Log\LoggerAwareInterface;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;

/**
 * An interface for a generic storage for EntitySystemWithMetadata statements.
 */
interface StatementStorage extends LoggerAwareInterface
{

    const string StoreStatementCommand = 'storeStatement';
    const string CancelStatementCommand = 'cancelStatement';

    /**
     * Stores a statement and, optionally, statement metadata
     *
     * Statement metadata is an array of pairs that represent statements where the statement to store
     * is the subject:
     *
     *   [ predicate, object]
     *
     * Implementations may store some statement metadata, for example, in the same database row as the statement itself
     * instead of in their own rows, which would save from storage space.
     *
     * @param int $statementId
     * @param int $subject
     * @param int $predicate
     * @param string|int $object
     * @param array $statementMetadata
     * @return void
     */
    public function storeStatement(int $statementId, int $subject, int $predicate, string|int $object, array $statementMetadata = []) : void;

    /**
     * Retrieves a statement, optionally including the statement and cancellation metadata
     *
     * Returns a 7-tuple:
     *
     *   [ statementId, subject, predicate, object, cancellationId|null, statementMetadataArray|null, cancellationMetadata|null ]
     *
     * @param int $statementId
     * @param bool $withMetadata
     * @return array
     * @throws StatementNotFoundException
     */
    public function retrieveStatement(int $statementId, bool $withMetadata = true) : array;


    /**
     * Retrieves the statement with the given cancellation id
     *
     * Returns a 7-tuple:
     *
     *   [ statementId, subject, predicate, object, cancellationId|null, statementMetadataArray|null, cancellationMetadata|null ]
     *
     * @param int $cancellationId
     * @param bool $withMetadata
     * @return array
     * @throws StatementNotFoundException
     */
    public function retrieveStatementByCancellationId(int $cancellationId, bool $withMetadata = true) : array;


    /**
     * Marks a statement as cancelled with the given cancellation id, optionally
     * storing also cancellation metadata.
     *
     * Cancellation metadata, similar to statement metadata, is an array of [ predicate, object] pairs
     * that represent statements about the cancellation entity identified by $cancellationId.
     * Implementations may store this metadata together with the cancelled statement.
     *
     * @param int $statementId
     * @param int $cancellationId
     * @param array $cancellationMetadata
     * @return void
     * @throws StatementNotFoundException
     * @throws StatementAlreadyCancelledException
     */
    public function cancelStatement(int $statementId, int $cancellationId, array $cancellationMetadata = []): void;


    /**
     *  Finds all statements involving the given subject, predicate and object.
     *  Null means any. So, for example: getStatements($entity, null, null) returns all the
     *  statements in which $entity is a subject, with any predicate and any object.
     *
     * Returns an array of 7-tuples:
     *
     *   [ statementId, subject, predicate, object, cancellationId|null, statementMetadataArray|null, cancellationMetadata|null ]
     *
     * @param int|null $subject
     * @param int|null $predicate
     * @param string|int|null $object
     * @param bool $withMetadata
     * @param bool $includeCancelled
     * @return array
     */
    public function findStatements(int|null $subject, int|null $predicate, string|int|null $object,
                                   bool $withMetadata = true, bool $includeCancelled = false) : array;


    /**
     *
     * Makes multiple statement and cancellations in a single operation
     * using storage/database transactions if available.
     *
     * Each row in the $statementsAndCancellations array is a storeStatement or cancelStatement command.
     * The first element is the command name and rest of the elements are the parameters:
     *
     * [ [ 'storeStatement',  statementId, subject, predicate, object, metadata ],
     *  [ 'cancelStatement', statementId, cancellationId, metadata ], ... ]
     *
     * If the underlying storage supports transactions and there's an error in one of the commands, the
     * transaction will be rolled back.
     *
     * @param array $statementsAndCancellations
     * @return void
     */
    public function storeMultipleStatementsAndCancellations(array $statementsAndCancellations) : void;
}