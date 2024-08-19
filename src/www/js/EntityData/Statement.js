
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

  static getMetadataPredicate(statement, predicateId) {
    for (let i  = 0; i < statement['statementMetadata'].length; i++) {
      let [ predicate, object] = statement['statementMetadata'][i];
      if (predicate === predicateId) {
        return object;
      }
    }
    // should never happen though
    return null;
  }
}