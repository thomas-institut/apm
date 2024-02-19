import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './common/SiteLang'

export class ErrorPage extends NormalPage {

  constructor (options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'ErrorPage',
      optionsDefinition: {
        errorMessage: { type: 'string', required: true},
        title: { type: 'string', required: true}
      }
    })

    let cleanOptions = oc.getCleanOptions(options);

    this.errorMessage = cleanOptions.errorMessage;
    this.title = cleanOptions.title;


    this.initPage().then( () => {});
  }

  async initPage () {
    await super.initPage();
    document.title = this.title;
  }

  async genContentHtml () {
    return `<h1>${tr('Error')}</h1>
        <div class="error-message">
        ${this.errorMessage}
        </div>`;
  }

}


window.ErrorPage = ErrorPage;