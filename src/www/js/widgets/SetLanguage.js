import { OptionsChecker } from '@thomas-inst/optionschecker'
import { getLangName, TranscriptionLanguages } from '../constants/TranscriptionLanguages'
import { ProcessingInfoWidget } from './ProcessingInfoWidget'
import { wait } from '../toolbox/FunctionUtil.mjs'
import { ConfirmDialog } from '../pages/common/ConfirmDialog'

export class SetLanguage {

  constructor(options) {
    const oc = new OptionsChecker({
      context: "SetLanguage",
      optionsDefinition: {
        containerSelector: { type: 'string'},
        defaultLanguage: { type: 'number' },
        onSetLanguage: { type: 'function' },
        buttonLabel: { type: 'string', default: "Set Language" },
        confirmMessage: { type: 'string', default: "Are you sure you want to set the language?" },
      }
    });

    this.options  = oc.getCleanOptions(options);

    this.container = $(this.options.containerSelector);
    this.container.html(this.getHtml());
    this.langSelect = $(`${this.options.containerSelector} .lang-select`);
    this.setButton = $(`${this.options.containerSelector} .set-btn`);

    this.infoWidget = new ProcessingInfoWidget({
      containerSelector: `${this.options.containerSelector} span.info`,
      processingMessage: 'Setting default language for all pages, this may take a while',
      successClass: 'text-success',
    });

    this.setButton.on('click', this.genOnClickSetButton());
  }



  genOnClickSetButton() {
    return async () => {
      console.log(`Set language button clicked`);
      let newLang = parseInt(this.langSelect.val());
      let newLangName = getLangName(newLang);

      (new ConfirmDialog({
        acceptButtonLabel: "Yes, do it",
        cancelButtonLabel: "No",
        body: `<p>Selected Language: <b>${newLangName}</b></p><p>${this.options.confirmMessage}</p>`,
        acceptFunction: async () => {
          this.setButton.addClass('hidden');
          this.infoWidget.start();
          let result = await this.options.onSetLanguage(newLang);
          if (result === '') {
            this.infoWidget.success("done!");
            await wait(1000);
          } else {
            this.infoWidget.fail(`Error: ${result}, please try again later`);
            await wait(3000);
          }
          this.infoWidget.hide();
          this.setButton.removeClass('hidden');
        }
      })).show();
    }
  }

  /**
   * @private
   */
  getHtml() {
    return [
      `<select class="lang-select">`,
      ...TranscriptionLanguages.map( (tl) => {
        return `<option value="${tl['id']}" ${tl['id']===this.options.defaultLanguage ? 'selected' : ''}>${tl['name']}</option>`
      }),
      `</select>`,
      `<span class="info"></span>`,
      `<button class="btn btn-sm btn-primary set-btn">${this.options.buttonLabel}</button>`,
    ].join('')
  }

}