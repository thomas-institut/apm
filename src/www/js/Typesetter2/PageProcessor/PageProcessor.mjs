import { resolvedPromise } from '../../toolbox/FunctionUtil.mjs'

export class PageProcessor {

  /**
   * Performs some operation in a list and returns its result
   * @param {TypesetterPage}page
   * @return {Promise<TypesetterPage>}
   */
  process(page) {
    return resolvedPromise(page)
  }
}