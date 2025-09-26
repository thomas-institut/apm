import {Statement} from './Statement'

import {StatementDataInterface} from "@/Api/DataSchema/ApiEntity";


export interface EditOperation {
  n: number;
  operation: string;
  timestamp: number;
  statementId: any;
}

export class StatementArray {

  /**
   * Returns an array with an ordered list of edit operations inferred from the given
   * statement array.
   *
   * @param statementArray
   */
  static getEditHistory(statementArray: StatementDataInterface[]): EditOperation[] {
    let ops: EditOperation[] = [];
    statementArray.forEach((statement) => {
      ops.push({
        operation: 'creation',
        timestamp: Statement.getEditTimestamp(statement),
        statementId: statement.id,
        n: 0
      });
      if (statement['cancellationId'] !== -1) {
        let cancellationTimestamp = Statement.getCancellationTimestamp(statement);
        if (cancellationTimestamp !== null) {
          ops.push({
            operation: 'cancellation',
            timestamp: cancellationTimestamp,
            statementId: statement.id,
            n: 0
          });
        }
      }
    });
    ops.sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.statementId - b.statementId;
      }
      return a.timestamp - b.timestamp
    });
    return ops;
  }

  /**
   * Returns all non-cancelled statements in the array
   * @param statementArray
   */
  static getCurrentStatements(statementArray: StatementDataInterface[]): StatementDataInterface[] {
    return statementArray.filter( (statement) => { return statement.cancellationId === -1});
  }

  static getStatementsForPredicate(statementArray: StatementDataInterface[], predicate: number, includeCancelled = false): StatementDataInterface[] {
    return statementArray.filter( (statement) => {
        return statement.predicate === predicate && (statement.cancellationId === -1 || includeCancelled );
      });
  }

}