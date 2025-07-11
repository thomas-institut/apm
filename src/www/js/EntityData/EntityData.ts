import { StatementArray } from './StatementArray'
import {StatementInterface} from "./Statement";

export class EntityData {

  /**
   * Returns all current objects for the given predicate
   */
  static getStatementsForPredicate(data:any, predicate: number, includeCancelled = false): StatementInterface[] {
    return StatementArray.getStatementsForPredicate(data.statements, predicate, includeCancelled);
  }


  static getSingleCurrentStatement(data:any, predicate:number): StatementInterface | null {
    let activeStatements = this.getStatementsForPredicate(data, predicate, false);
    return activeStatements.length === 0 ? null : activeStatements[0];
  }

}