
import * as Entity from '../constants/Entity'
import {StatementDataInterface, StatementMetadata} from "../../schema/Schema";



export class Statement {

  static getAuthor(statement: StatementDataInterface) {
    return this.getMetadataPredicate(statement, Entity.pStatementAuthor);
  }

  static getEditTimestamp(statement: StatementDataInterface) {
    let ts = this.getMetadataPredicate(statement, Entity.pStatementTimestamp);
    if (ts === null) {
      return -1;
    }
    return parseInt(ts.toString());
  }

  static getEditorialNote(statement: StatementDataInterface) {
    return this.getMetadataPredicate(statement, Entity.pStatementEditorialNote);
  }

  static getCancellationAuthor(statement: StatementDataInterface) {
    return this.getCancellationMetadataPredicate(statement, Entity.pCancelledBy);
  }

  static getCancellationTimestamp(statement: StatementDataInterface) {
    let ts = this.getCancellationMetadataPredicate(statement, Entity.pCancellationTimestamp);
    if (ts === null) {
      return null;
    }
    return parseInt(ts.toString());
  }

  static getCancellationEditorialNote(statement: StatementDataInterface) {
    return this.getCancellationMetadataPredicate(statement, Entity.pCancellationEditorialNote);
  }

  static getCancellationMetadataPredicate(statement: StatementDataInterface, predicateId: number) {
    return this.getMetadataPredicateGeneric(statement, predicateId, 'cancellationMetadata');
  }

  static getMetadataPredicate(statement: StatementDataInterface, predicateId: number) {
    return this.getMetadataPredicateGeneric(statement, predicateId, 'statementMetadata');
  }

  static getMetadataPredicateGeneric(statement: StatementDataInterface, predicateId: number, field: string): number|string|null {
    let metadata: StatementMetadata[]|null = null;
    switch (field) {
      case 'statementMetadata':
        metadata = statement.statementMetadata;
        break;

        case 'cancellationMetadata':
          metadata = statement.cancellationMetadata;

    }
    if (metadata === null) {
      throw new Error("Invalid field: " + field + "");
    }

    for (let i  = 0; i < metadata.length; i++) {
      let [ predicate, object] = metadata[i];
      if (predicate === predicateId) {
        return object;
      }
    }
    return null;
  }
}