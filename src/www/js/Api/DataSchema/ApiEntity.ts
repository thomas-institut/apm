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
  object: number | string;
  statementMetadata: StatementMetadata[];
  cancellationId: number;
  cancellationMetadata: StatementMetadata[];
}

export type StatementMetadata = [number, number | string];


export interface PredicateDefinitionsForType {
  type: number;
  predicatesAllowedAsSubject: number[];
  predicatesAllowedAsObject: number[];
  predicateDefinitions: { [key: number]: PredicateDefinitionInterface};
  qualificationDefinitions: { [key: number]: PredicateDefinitionInterface};
}

export interface EntityDefinitionInterface {
  id: number,
  type: number,
  name: string,
  description: string,
  translatedNames: { [key: string]: string},
  translatedDescriptions: { [key: string]: string},
  deprecated: boolean,
  deprecationNotice: string
}

export interface PredicateDefinitionInterface extends EntityDefinitionInterface {
  /**
   *  If true, only one object/value for this predicate is allowed for each entity.
   *  For example, the predicate `pEntityName`.
   */
  singleProperty: boolean;
  /**
   * List of string allowed as values. If null, checking is
   * deferred to allowedObjectTypes.
   */
  allowedValues: string[] | null;
  /**
   * Flags that apply to the predicate
   */
  flags: number[] | null;
  /**
   * Allowed entity types or value types for the object. If null
   * any type is allowed.
   */
  allowedObjectTypes: number[] | null;
  /**
   *  Reverse predicate. E.g. for  rChild the reverse is rParent
   */
  reversePredicate: number | null;
  allowedQualifications: number[] | null;
  isPrimaryRelation: boolean;
  canBeCancelled: boolean;
}