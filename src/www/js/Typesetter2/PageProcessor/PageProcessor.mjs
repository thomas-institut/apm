export class PageProcessor {

  /**
   * Performs some operation in a list and returns its result
   * @param {TypesetterPage}page
   * @return {Promise<TypesetterPage>}
   */
  process(page) {
    return Promise.resolve(page)
  }
}