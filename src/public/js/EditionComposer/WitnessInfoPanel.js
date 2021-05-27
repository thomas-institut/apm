/**
 * The Witness Info panel in the Editor Composer.
 *
 *  - Table of witnesses
 *  - Witness order
 *  - Sigla (with preset)
 *  - Witness update: update status, check for updates and launch the witness update task
 */
import { Panel } from './Panel'

export class WitnessInfoPanel extends Panel{
  constructor (options = {}) {
    super(options)

    let optionsSpec = {

    }
  }

  generateHtml() {
    return `Witness Info Panel will be here`
  }


}