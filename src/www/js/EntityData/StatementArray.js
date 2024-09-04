import { Statement } from './Statement'

export class StatementArray {



  /**
   * Returns an array with an ordered list of edit operations inferred from the given
   * statement array.
   *
   * Each edit operation is an object of the form
   *
   *   *{ operation: 'creation'|'cancellation', timestamp: someTimestamp; statementId: someId}*
   *
   * @param statementArray
   */
  static getEditHistory(statementArray) {
    let ops = [];
    statementArray.forEach( (statement) => {
      ops.push({ operation: 'creation', timestamp: Statement.getEditTimestamp(statement), statementId: statement.id });
      if (statement['cancellationId'] !== -1) {
        let cancellationTimestamp = Statement.getCancellationTimestamp(statement);
        if (cancellationTimestamp !== null) {
          ops.push({ operation: 'cancellation', timestamp: cancellationTimestamp, statementId: statement.id});
        }
      }

    });
    ops.sort( (a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.statementId - b.statementId;
      }
      return a.timestamp - b.timestamp});
    return ops;
  }

  /**
   * Returns all non-cancelled statements in the array
   * @param statementArray
   */
  static getCurrentStatements(statementArray) {
    return statementArray.filter( (statement) => { return statement['cancellationId'] === -1});
  }

  static getStatementsForPredicate(statementArray, predicate, includeCancelled = false) {
    return statementArray.filter( (statement) => {
        return statement.predicate === predicate && (statement['cancellationId'] === -1 || includeCancelled );
      });
  }

}