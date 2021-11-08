import { deepCopy } from '../../toolbox/Util.mjs'

/**
 * Base class for updater process
 */


export class CtDataCleaner {

  constructor (options = {}) {
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
  sourceSchemaVersion() {
    return ''
  }


  /**
   *
   * @param {object} sourceCtData
   * @return {*}
   */
  getCleanCtData(sourceCtData) {
    if (sourceCtData['schemaVersion'] === undefined) {
      throw new Error('CtData does not have an schema version defined')
    }

    if (sourceCtData['schemaVersion'] !== this.sourceSchemaVersion()) {
      throw new Error(`Cannot clean schema version ${sourceCtData['schemaVersion']}, expected version ${this.sourceSchemaVersion()}`)
    }

    return deepCopy(sourceCtData)
  }

}