import { CtDataUpdater } from './CtDataUpdater'
import { EDITION } from '../../constants/CollationTableType'
import * as ApparatusType from '../../constants/ApparatusType'

/**
 * Schema 1.3 adds a 'marginalia' apparatus to editions
 */
export  class UpdaterToOnePointThree extends CtDataUpdater {

  constructor (options = {}) {
    super(options)
  }

  sourceSchemaVersion () {
    return '1.2'
  }

  targetSchemaVersion () {
    return '1.3'
  }

  update (sourceCtData) {
    let ctData =  super.update(sourceCtData)

    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`)


    if (sourceCtData['type'] === EDITION) {
      let currentMarginaliaApparatusIndex = ctData['customApparatuses'].map( app => app['type']).indexOf('marginalia')
      if (currentMarginaliaApparatusIndex === -1) {
        ctData['customApparatuses'].push( { type: ApparatusType.MARGINALIA, entries: []})
      } else {
        // this is not an error,
        console.log(`Found a marginalia apparatus in CtData version ${this.sourceSchemaVersion()}`)
      }
    }

    // done!
    ctData['schemaVersion'] = this.targetSchemaVersion()
    return ctData
  }
}