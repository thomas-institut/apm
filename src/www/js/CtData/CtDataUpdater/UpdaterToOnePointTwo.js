import { CtDataUpdater } from './CtDataUpdater'
import { EDITION } from '../../constants/CollationTableType'

export  class UpdaterToOnePointTwo extends CtDataUpdater {

  constructor (options = {}) {
    super(options)
  }

  sourceSchemaVersion () {
    return '1.1'
  }

  targetSchemaVersion () {
    return '1.2'
  }

  update (sourceCtData) {
    let ctData =  super.update(sourceCtData)

    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`)


    if (sourceCtData['type'] === EDITION) {
      // update custom apparatuses
      ctData['customApparatuses'] = ctData['customApparatuses'].map( (app) => {
        app['entries'] = app['entries'].map ( (entry, entryIndex) => {
          entry['subEntries'] = entry['subEntries'].map( (subEntry, subEntryIndex) => {
            subEntry['position'] = -1
            if (subEntry.type === 'fullCustom') {
              // add an empty parts array
              // subEntry['fmtText'] is kept for now
              subEntry['parts'] = []
            }
            return subEntry
          })
          return entry
        })
        return app
      })
    }

    // done!
    ctData['schemaVersion'] = this.targetSchemaVersion()
    return ctData
  }
}