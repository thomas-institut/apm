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

  static getPredicateObject(data: EntityDataInterface, predicate: number) : string | number | null {
    let statement = this.getSingleCurrentStatement(data, predicate);
    return statement === null ? null : statement.object;
  }

  static getAttributeValue(data: EntityDataInterface, predicate: number) : string | null {
    return this.getPredicateObject(data, predicate) as string|null;
  }

  static getBooleanAttributeValue(data: EntityDataInterface, predicate: number) : boolean | null {
    let value = this.getPredicateObject(data, predicate);
    return value === null ? null : value === '1';
  }

}