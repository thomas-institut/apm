import { deepCopy } from '../../toolbox/Util'
import {CtDataInterface} from "../CtDataInterface";

/**
 * Base class for updater process
 */


export class CtDataCleaner {
  protected verbose: any;
  protected debug: any;

  constructor (options: any = {}) {
    this.verbose = options.verbose === undefined ? false : options.verbose
    this.debug =  options.debug === undefined ? false : options.debug

    if (this.debug) {
      this.verbose = true
    }
  }

  /**
   * Returns the CtData schema version this cleaner works with
   * @return {string}
   */
  sourceSchemaVersion(): string {
    return ''
  }


  /**
   *
   * @param {object} sourceCtData
   * @return {*}
   */
  getCleanCtData(sourceCtData : CtDataInterface) : CtDataInterface {
    if (sourceCtData['schemaVersion'] === undefined) {
      throw new Error('CtData does not have an schema version defined')
    }

    if (sourceCtData['schemaVersion'] !== this.sourceSchemaVersion()) {
      throw new Error(`Cannot clean schema version ${sourceCtData['schemaVersion']}, expected version ${this.sourceSchemaVersion()}`)
    }

    return deepCopy(sourceCtData)
  }

}