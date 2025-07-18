import { StatementArray } from './StatementArray'
import {EntityDataInterface, StatementDataInterface} from "../../schema/Schema";

export class EntityData {

  /**
   * Returns all current objects for the given predicate
   */
  static getStatementsForPredicate(data:EntityDataInterface, predicate: number, includeCancelled = false): StatementDataInterface[] {
    return StatementArray.getStatementsForPredicate(data.statements, predicate, includeCancelled);
  }


  static getSingleCurrentStatement(data:EntityDataInterface, predicate:number): StatementDataInterface | null {
    let activeStatements = this.getStatementsForPredicate(data, predicate, false);
    return activeStatements.length === 0 ? null : activeStatements[0];
  }

}