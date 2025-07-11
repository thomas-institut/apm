
import * as Entity from '../constants/Entity'


export interface StatementInterface {
  id: number;
  subject: number;
  predicate: number;
  object: number|string;
  statementMetadata: [number, any][];
  cancellationId: number;
  cancellationMetadata: [number, any][];
}
export class Statement {

  static getAuthor(statement: StatementInterface) {
    return this.getMetadataPredicate(statement, Entity.pStatementAuthor);
  }

  static getEditTimestamp(statement: StatementInterface) {
    return parseInt(this.getMetadataPredicate(statement, Entity.pStatementTimestamp));
  }

  static getEditorialNote(statement: StatementInterface) {
    return this.getMetadataPredicate(statement, Entity.pStatementEditorialNote);
  }

  static getCancellationAuthor(statement: StatementInterface) {
    return this.getCancellationMetadataPredicate(statement, Entity.pCancelledBy);
  }

  static getCancellationTimestamp(statement: StatementInterface) {
    return parseInt(this.getCancellationMetadataPredicate(statement, Entity.pCancellationTimestamp));
  }

  static getCancellationEditorialNote(statement: StatementInterface) {
    return this.getCancellationMetadataPredicate(statement, Entity.pCancellationEditorialNote);
  }

  static getCancellationMetadataPredicate(statement: StatementInterface, predicateId: number) {
    return this.getMetadataPredicateGeneric(statement, predicateId, 'cancellationMetadata');
  }

  static getMetadataPredicate(statement: StatementInterface, predicateId: number) {
    return this.getMetadataPredicateGeneric(statement, predicateId, 'statementMetadata');
  }

  /**
   *
   * @param statement
   * @param predicateId
   * @param field
   * @return {any}
   * @private
   */
  static getMetadataPredicateGeneric(statement: { [key:string]:any }, predicateId: number, field: string):any {
    if (statement[field] === undefined || statement[field] === null) {
      return null;
    }
    for (let i  = 0; i < statement[field].length; i++) {
      let [ predicate, object] = statement[field][i];
      if (predicate === predicateId) {
        return object;
      }
    }
    return null;
  }
}