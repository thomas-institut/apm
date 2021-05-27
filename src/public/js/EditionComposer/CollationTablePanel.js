/**
 * The collation table panel in the EditorComposer.
 *
 *  - Collation table manipulation: moving, grouping, normalizations
 */
import { Panel } from './Panel'

export class CollationTablePanel extends Panel{
  constructor (options = {}) {
    super(options)
  }

  generateHtml () {
    return `The Collation table will be here`
  }

}