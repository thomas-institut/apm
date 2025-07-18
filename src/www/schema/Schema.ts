/**
 * Interfaces for important data structures from PHP that need to
 * be available in JS/TS as well
 *
 */


export interface EntityDataInterface {
    /** Entity id */
    id: number;
    /** The entity's type */
    type: number;
    /** The entity's name */
    name: string;
    /** Statements in which the entity appears as a subject. */
    statements: StatementDataInterface[];
    /** Statements in which the entity appears as object */
    statementsAsObject: StatementDataInterface[];
    /** If the entity is merged, the non-merged entity into which this entity resolves. Null otherwise */
    mergedInto: number | null;
}

export interface StatementDataInterface {
    id: number;
    subject: number;
    predicate: number;
    object: number|string;
    statementMetadata: StatementMetadata[];
    cancellationId: number;
    cancellationMetadata: StatementMetadata[];
}


export type StatementMetadata = [number, number | string];