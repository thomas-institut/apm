
import * as Entity from '../constants/Entity.js'

export class Statement {

  static getAuthor(statement) {
    return this.getMetadataPredicate(statement, Entity.pStatementAuthor);
  }

  static getEditTimestamp(statement) {
    return parseInt(this.getMetadataPredicate(statement, Entity.pStatementTimestamp));
  }

  static getEditorialNote(statement) {
    return this.getMetadataPredicate(statement, Entity.pStatementEditorialNote);
  }

  static getCancellationAuthor(statement) {
    return this.getCancellationMetadataPredicate(statement, Entity.pCancelledBy);
  }

  static getCancellationTimestamp(statement) {
    return parseInt(this.getCancellationMetadataPredicate(statement, Entity.pCancellationTimestamp));
  }

  static getCancellationEditorialNote(statement) {
    return this.getCancellationMetadataPredicate(statement, Entity.pCancellationEditorialNote);
  }

  static getCancellationMetadataPredicate(statement, predicateId) {
    return this.getMetadataPredicateGeneric(statement, predicateId, 'cancellationMetadata');
  }

  static getMetadataPredicate(statement, predicateId) {
    return this.getMetadataPredicateGeneric(statement, predicateId, 'statementMetadata');
  }

  /**
   *
   * @param statement
   * @param predicateId
   * @param field
   * @return {*|null}
   * @private
   */
  static getMetadataPredicateGeneric(statement, predicateId, field) {
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