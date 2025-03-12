import { OptionsChecker } from '@thomas-inst/optionschecker'

/**
 * Widget to display a "processing" message with a spinner
 *
 */
export class ProcessingInfoWidget {

  constructor(options) {
    const oc = new OptionsChecker({
      context: "ProcessingInfo",
      optionsDefinition: {
        containerSelector: { type: 'string'},
        processingMessage: { type: 'string', default: "Processing" },
        processingClass: { type: 'string', default: "text-primary" },
        successMessage: { type: 'string', default: "Done"},
        successClass: { type: 'string', default: "text-primary" },
        failMessage: { type: 'string', default: "Error"},
        failClass: { type: 'string', default: "text-danger" },

      }
    });

    this.options = oc.getCleanOptions(options);
    this.container = $(this.options.containerSelector);
    this.container.html('');
    this.processingMessage = this.options.processingMessage;
    this.successMessage = this.options.successMessage;
    this.failMessage = this.options.failMessage;
  }

  hide() {
    this.container.html('');
  }

  start(message = null) {
    if (message !== null) {
      this.processingMessage = message;
    }
    this.container.html(`<span class="${this.options.processingClass}">${this.processingMessage}...</span><div class="spinner-border spinner-border-sm ${this.options.processingClass}" role="status">
  <span class="sr-only">${this.processingMessage}...</span>
</div>`)
  }

  success(message = null) {
    if (message !== null) {
      this.successMessage = message;
    }
    this.container.html(`<span class="${this.options.processingClass}">${this.processingMessage}...${this.successMessage}</span>`);
  }

  fail(message = null) {
    if (message !== null) {
      this.failMessage = message;
    }
    this.container.html(`<span class="${this.options.processingClass}">${this.processingMessage}...</span>
    <span class="${this.options.failClass}">${this.failMessage}</span>`);
  }

}