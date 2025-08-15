import {TypesetterPage} from "../TypesetterPage.js";

export class PageProcessor {

  /**
   * Performs an operation on the the page
   */
  process(page: TypesetterPage): Promise<TypesetterPage> {
    return Promise.resolve(page);
  }
}