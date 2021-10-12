import { DefPagesDefRange } from '../DefPagesDefRange'
import { DefPagesDefAll } from '../DefPagesDefAll'
import { DefPagesAddPages } from '../DefPagesAddPages'

export class DocDefPages {

  constructor (pageTypes, numPages, docId, urlGenerator) {
    new DefPagesDefAll(numPages, 'dap-', docId, urlGenerator)
    new DefPagesDefRange(numPages, 'dr-', docId, pageTypes, urlGenerator)
    new DefPagesAddPages(numPages, 'ap-', docId, urlGenerator)
  }

}

window.DocDefPages = DocDefPages