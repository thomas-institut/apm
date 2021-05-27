/**
 * Edition  Panel.
 *
 *  - Edition text and apparatus manipulation in a printed edition type user interface
 */
import { Panel } from './Panel'

export class EditionPanel extends Panel{

  constructor (options = {}) {
    super(options)
  }

  generateHtml () {
    return`Edition user interface will be here`
  }

}