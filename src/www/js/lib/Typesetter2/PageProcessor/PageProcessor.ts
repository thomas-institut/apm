import {TypesetterPage} from "../TypesetterPage.js";

export class PageProcessor {

  /**
   * Performs an operation on the the page
   */
  async process(page: TypesetterPage): Promise<TypesetterPage> {
    return page;
  }
}