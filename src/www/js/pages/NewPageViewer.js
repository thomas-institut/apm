import { OptionsChecker } from '@thomas-inst/optionschecker'
import { HtmlSnippet } from '../toolbox/HtmlSnippet'

export class NewPageViewer {

   constructor (options) {
    const oc = new OptionsChecker({
      context: 'NewPageViewer',
      optionsDefinition: {
        containerSelector: { type: 'string', required: true},
        userId: { type: 'NonZeroNumber', required: true },
        pageId: { type: 'NonZeroNumber', required: true },
        baseUrl: { type: 'string', required: true},
        activeColumn: { type: 'number', default: 1 }
      }
    });

    this.options = oc.getCleanOptions(options);
    this.userId = this.options.userId;
    this.pageId = this.options.pageId;
    this.containerSelector = this.options.containerSelector;
    this.container = $(this.containerSelector);

    this.urlGen = new ApmUrlGenerator(this.options.baseUrl);
    this.loadInitialData().then( () => {
      this.container.html(this.getHtml())
    }).catch( (e) => {
      console.error(`Could not load data`)
      console.log(e)
      this.container.html(`<p class="text-danger">ERROR: could not load data</p>`)
    })
  }

  /**
   * Loads essential data to start UI
   * @return {Promise<void>}
   * @private
   */
    async loadInitialData() {
    this.container.html(HtmlSnippet.loadingDataMessage('Loading page info...'))
    this.pageInfo = await this.fetchPageInfo(this.pageId)
    this.container.html(HtmlSnippet.loadingDataMessage(`Loading document info...`))
  }

  getHtml() {
    return `<h1>Page ${this.pageId}</h1><p>New viewer coming up soon.</p>`
  }

  /**
   * Fetches page info from server
   * @param {number}pageId
   * @private
   */
  fetchPageInfo(pageId) {
    return new Promise( async (resolve, reject) => {
      $.post(this.urlGen.apiGetPageInfo(), {
        data: JSON.stringify({ pages: [ pageId]})
      }).done( (apiResponse) => {
        if (apiResponse.length !== 1) {
          console.log(`Bad api response`);
          console.log(apiResponse);
          reject(`Expected one page info item in response, got ${apiResponse.length}`);
        }
        resolve(apiResponse[0]);
      }).fail( (resp) => {
        reject(resp.responseText);
      });
    });
  }

}


window.NewPageViewer = NewPageViewer