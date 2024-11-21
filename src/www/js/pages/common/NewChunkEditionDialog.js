import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './SiteLang'
import { GetDataAndProcessDialog } from './GetDataAndProcessDialog'
import { urlGen } from './SiteUrlGen'
import { ApmDataProxy } from './ApmDataProxy'

export class NewChunkEditionDialog {
  constructor (options = {}) {
    let oc = new OptionsChecker({
      context: 'NewChunkEditionDialog',
      optionsDefinition: {
        apmDataProxy: { type: 'object', objectClass: ApmDataProxy},
        debug: { type: 'boolean', default: true},
      }
    })
    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;
    this.dialog = null;
    this.currentAuthor = -1;
  }

  createNewChunkEdition() {
    return new Promise( async (resolve) => {
      this.systemLanguages = await this.options.apmDataProxy.getSystemLanguages();


      this.dialog = new GetDataAndProcessDialog({
        title: tr('New Chunk Edition'),
        cancelButtonLabel: tr('Cancel'),
        processButtonLabel: tr('Create New Chunk Edition'),
        getBodyHtml: this.genGetBodyHtml(),
        initialData: { work: '', chunkNumber: 1, lang: 'la' },
        validateData: this.genValidateData(),
        getDataFromForm: this.genGetDataFromForm(),
        processData: async (data) => {
          window.open(urlGen.siteChunkEditionNew(data.work, data.chunkNumber, data.lang));
          return { success: true}
        }
      });
      return this.dialog.process();
    })
  }

  genGetDataFromForm() {
    return async (dialogSelector) => {
      let authorInput = $(`${dialogSelector} .author-input`);
      let workInput = $(`${dialogSelector} .work-input`);
      let chunkNumberInput = $(`${dialogSelector} .chunk-number-input`);
      let languageInput = $(`${dialogSelector} .language-input`);

      let author = parseInt(authorInput.val().toString());
      if (author !== this.currentAuthor) {
        this.currentAuthor = author;
        if (author === -1) {
          workInput.html('<option value=""></option>');
          return {
              work: '',
              chunkNumber: parseInt(chunkNumberInput.val().toString()),
              lang: languageInput.val()
          }
        }
        // need to reload work input selector
        let works = (await this.options.apmDataProxy.getPersonWorks(author))['works'];
        workInput.html( '<option value=""></option>' +
          works.map( (work) => { return `<option value="${work['workId']}">${work['workId']}: ${work['title'].substring(0, 80)}</option>` }).join('') );
        return {
          work: '',
          chunkNumber: parseInt(chunkNumberInput.val().toString()),
          lang: languageInput.val()
        }
      }
      return {
        work: workInput.val().trim(),
        chunkNumber: parseInt(chunkNumberInput.val().toString()),
        lang: languageInput.val()
      }
    }
  }

  genGetBodyHtml() {
    return async () => {
      let languagesSelectHtml = '<select class="language-input">'  +
          this.systemLanguages.map((lang) => { return `<option value="${lang.code}">${tr(lang.name)}</option>` }).join('') +
         '</select>';

      let authors = await this.options.apmDataProxy.getAuthors();
      let authorData = await Promise.all( authors.map( (authorId) => { return this.options.apmDataProxy.getPersonEssentialData(authorId); }) );
      // this.debug && console.log('Author data', authorData);
      let authorSelectHtml = '<select class="author-input">' +
        '<option value="-1"></option>' +
        authorData.map( (authorInfo) => { return `<option value="${authorInfo.tid}">${authorInfo.name}</option>` }) +
        '</select>';

      this.currentAuthor = -1;
      let workSelectHtml = '<select class="work-input" style="max-width: 32em"><option value=""></option></select>'

      return `<div class="new-chunk-edition-form" style="display: grid; grid-template-columns: 25% auto; row-gap: 0.5em">
        <div class="new-chunk-edition-item">${tr('Author')}</div>
        <div class="new-chunk-edition-input-div">${authorSelectHtml}</div>
        <div class="new-chunk-edition-item">${tr('Work')}</div>
        <div class="new-chunk-edition-input-div">${workSelectHtml}</div>
        <div class="new-chunk-edition-item">${tr('Chunk Number')}</div>
        <div class="new-chunk-edition-input-div"><input type="number" class="chunk-number-input" value="1"></div>
        <div class="new-chunk-edition-item">${tr('Language')}</div>
        <div class="new-chunk-edition-input-div">${languagesSelectHtml}</div>
         </div>`;
    }
  }

  genValidateData() {
    return (data) => {
      // this.debug && console.log("Validating data", data);
      if (data.work === '' ) {
        return `<span class="text-warning">${tr('Choose a work from the dropdown menu')}</span>`
      }
      if (isNaN(data.chunkNumber)) {
        return `<span class="text-danger">${tr('Invalid chunk number')}</span>`
      }
      if (data.chunkNumber <= 0) {
         return `<span class="text-danger">${tr('Chunk number must be greater than 0')}</span>`;
      }
      return data.lang !== undefined && data.lang !== '';
    }
  }

}