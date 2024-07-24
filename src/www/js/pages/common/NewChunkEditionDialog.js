import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, LARGE_DIALOG } from './ConfirmDialog'
import { tr } from './SiteLang'
import { GetDataAndProcessDialog } from './GetDataAndProcessDialog'
import { urlGen } from './SiteUrlGen'

export class NewChunkEditionDialog {
  constructor (options = {}) {
    let oc = new OptionsChecker({
      context: 'NewChunkEditionDialog',
      optionsDefinition: {
         debug: { type: 'boolean', default: true},
      }
    })
    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;
    this.dialog = null;
  }

  createNewChunkEdition() {
    return new Promise( (resolve) => {
      this.dialog = new GetDataAndProcessDialog({
        title: tr('New Chunk Edition'),
        processButtonLabel: tr('Create New Chunk Edition'),
        getBodyHtml: async () => {
          return `<div class="new-chunk-edition-form" style="display: grid; grid-template-columns: 25% auto">
        <div class="new-chunk-edition-item">${tr('Work')}</div>
        <div class="new-chunk-edition-input-div"><input type="text" size="50" class="work-input"></div>
        <div class="new-chunk-edition-item">${tr('Chunk Number')}</div>
        <div class="new-chunk-edition-input-div"><input type="number" class="chunk-number-input" value="1"></div>
        <div class="new-chunk-edition-item">${tr('Language')}</div>
        <div class="new-chunk-edition-input-div"><input type="text" class="language-input" value="la"></div>
         </div>`;},
        initialData: { work: '', chunkNumber: 1, lang: 'la' },
        validateData: (data) => {
          return data.work !== '' && data.chunkNumber >= 1 && ['la', 'he', 'ar'].includes(data.lang);
        },
        getDataFromForm: async (dialogSelector) => {
          let workInput = $(`${dialogSelector} .work-input`);
          let chunkNumberInput = $(`${dialogSelector} .chunk-number-input`);
          let languageInput = $(`${dialogSelector} .language-input`);
          return {
            work: workInput.val().trim(),
            chunkNumber: parseInt(chunkNumberInput.val().toString()),
            lang: languageInput.val().trim()
          }
        },
        processData: async (data) => {
          window.open(urlGen.siteChunkEditionNew(data.work, data.chunkNumber, data.lang));
          return { success: true}
        }
      });
      return this.dialog.process();
    })
  }

  getNewChunkEditionParameters() {
    return new Promise((resolve) => {
      this.dialog = new ConfirmDialog({
        title: tr('New Chunk Edition'),
        size: LARGE_DIALOG,
        acceptButtonLabel: tr('Create new chunk edition'),
        cancelButtonLabel: tr('Cancel'),
        body: this.getNewChunkEditionFormHtml(),
        hideOnAccept: false,
        cancelFunction: () => {
          this.debug && console.log(`Create new chunk edition`)
          resolve({ confirmed: false});
        }
      });
      this.dialog.hideAcceptButton();
      let ds = this.dialog.getSelector();
      this.debug && console.log(`Dialog selector: ${this.dialog.getSelector()}`);
      this.workInput = $(`${ds} .work-input`);
      this.chunkNumberInput = $(`${ds} .chunk-number-input`);
      this.languageInput = $(`${ds} .language-input`);
      this.workInput.on('change', this.genOnInputChange());
      this.chunkNumberInput.on('change', this.genOnInputChange());
      this.languageInput.on('change', this.genOnInputChange());
      this.dialog.setAcceptFunction(this.genOnAccept(resolve));
      this.dialog.show();
    })
  }

  getNewChunkEditionFormHtml() {
    return `<div class="new-chunk-edition-form" style="display: grid; grid-template-columns: 25% auto">
        <div class="new-chunk-edition-item">${tr('Work')}</div>
        <div class="new-chunk-edition-input-div"><input type="text" size="50" class="work-input"></div>
        <div class="new-chunk-edition-item">${tr('Chunk Number')}</div>
        <div class="new-chunk-edition-input-div"><input type="number" class="chunk-number-input">1</div>
        <div class="new-chunk-edition-item">${tr('Language')}</div>
        <div class="new-chunk-edition-input-div"><input type="number" class="language-input">Latin</div>
    </div>
    <div class="info-div"></div>`;
  }

  genOnInputChange() {
    return () => {
      if (this.inputIsValid()) {
        this.dialog.showAcceptButton();
      } else
        this.dialog.hideAcceptButton();
    }
  }

  genOnAccept(resolve) {
    return () => {
      if (this.inputIsValid()) {
        resolve({ confirmed: true });
      }
    }

  }

  inputIsValid() {

    return false;
  }

}