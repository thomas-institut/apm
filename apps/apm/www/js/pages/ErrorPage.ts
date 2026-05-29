
import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './common/SiteLang'

export class ErrorPage extends NormalPage {
  private readonly errorMessage: string
  private readonly title: string

  constructor(options: any) {
    super(options)

    const oc = new OptionsChecker({
      context: 'ErrorPage',
      optionsDefinition: {
        errorMessage: { type: 'string', required: true },
        title: { type: 'string', required: true }
      }
    })

    const cleanOptions = oc.getCleanOptions(options)

    this.errorMessage = cleanOptions.errorMessage
    this.title = cleanOptions.title

    this.initPage().then(() => {})
  }

  async initPage(): Promise<void> {
    await super.initPage()
    document.title = this.title
  }

  async genContentHtml(): Promise<string> {
    return `<h1>${tr('Error')}</h1>
        <div class="error-message">
        ${this.errorMessage}
        </div>`
  }
}


(window as any).ErrorPage = ErrorPage