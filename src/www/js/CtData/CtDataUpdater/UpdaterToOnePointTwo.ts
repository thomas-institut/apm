import { CtDataUpdater } from './CtDataUpdater'
import { EDITION } from '../../constants/CollationTableType'
import {CtDataInterface} from "../CtDataInterface";
import {FULL_CUSTOM} from "../../Edition/SubEntryType";


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

  update (sourceCtData:CtDataInterface): CtDataInterface {
    let ctData =  super.update(sourceCtData)

    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`)


    if (sourceCtData.type === EDITION) {
      // update custom apparatuses
      ctData.customApparatuses = ctData.customApparatuses.map( (app) => {
        app.entries = app.entries.map ( (entry) => {
          entry.subEntries = entry.subEntries.map( (subEntry) => {
            subEntry.position = -1
            if (subEntry.type === FULL_CUSTOM) {
              // add keyword component
              subEntry.keyword = ''
            }
            return subEntry
          })
          return entry
        })
        return app
      })
    }

    // done!
    ctData.schemaVersion = this.targetSchemaVersion()
    return ctData
  }
}