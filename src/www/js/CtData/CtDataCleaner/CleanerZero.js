import { CtDataCleaner } from './CtDataCleaner'

export class CleanerZero extends CtDataCleaner {

  constructor (options = {}){
    super(options)
  }

  sourceSchemaVersion () {
    return '0'
  }

  getCleanCtData (sourceCtData) {
    this.debug && console.log(`Cleaning CtData for version 0, nothing to do, cleaner for 1.0 will do all the work`)
    return sourceCtData
  }
}