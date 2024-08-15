export class EntityData {

  /**
   * Returns all current objects for the given predicate
   * @param {object}data
   * @param {number}predicate
   * @param {boolean}includeCancelled
   * @return {string[]|number[]}
   */
  static getStatementsForPredicate(data, predicate, includeCancelled = false) {
    return data.statements
      .filter( (statement) => {
        return statement.predicate === predicate && (statement['cancellationId'] === -1 || includeCancelled );
      });
  }


  static getSingleCurrentStatement(data, predicate) {
    let activeStatements = this.getStatementsForPredicate(data, predicate, false);
    return activeStatements.length === 0 ? null : activeStatements[0];
  }

}