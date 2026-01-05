import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './SiteLang'
import { GetDataAndProcessDialog } from './GetDataAndProcessDialog'
import { urlGen } from './SiteUrlGen'
import { ApmApiClient } from '../../Api/ApmApiClient'
import {getIntVal, getStringVal} from "../../toolbox/UiToolBox";

export class NewChunkEditionDialog {
  private options: any;
  private dialog!: GetDataAndProcessDialog;
  private currentAuthor: number;
  private systemLanguages: any;
  constructor (options = {}) {
    let oc = new OptionsChecker({
      context: 'NewChunkEditionDialog',
      optionsDefinition: {
        apiClient: { type: 'object', objectClass: ApmApiClient},
        debug: { type: 'boolean', default: true},
      }
    })
    this.options = oc.getCleanOptions(options);
    this.currentAuthor = -1;
  }

  createNewChunkEdition() {
    return new Promise( async () => {
      this.systemLanguages = await this.options.apiClient.getLegacySystemLanguagesArray();


      this.dialog = new GetDataAndProcessDialog({
        title: tr('New Chunk Edition'),
        cancelButtonLabel: tr('Cancel'),
        processButtonLabel: tr('Create New Chunk Edition'),
        getBodyHtml: this.genGetBodyHtml(),
        initialData: { work: '', chunkNumber: 1, lang: 'la' },
        validateData: this.genValidateData(),
        getDataFromForm: this.genGetDataFromForm(),
        processData: async (data: any) => {
          window.open(urlGen.siteChunkEditionNew(data.work, data.chunkNumber, data.lang));
          return { success: true}
        }
      });
      return this.dialog.process();
    })
  }

  genGetDataFromForm() {
    return async (dialogSelector: string) => {
      let authorInput = $(`${dialogSelector} .author-input`);
      let workInput = $(`${dialogSelector} .work-input`);
      let chunkNumberInput = $(`${dialogSelector} .chunk-number-input`);
      let languageInput = $(`${dialogSelector} .language-input`);

      let author = getIntVal(authorInput);
      if (author !== this.currentAuthor) {
        this.currentAuthor = author;
        if (author === -1) {
          workInput.html('<option value=""></option>');
          return {
              work: '',
              chunkNumber: getIntVal(chunkNumberInput).toString(),
              lang: languageInput.val()
          }
        }
        // need to reload work input selector
        let works = (await this.options.apiClient.getPersonWorks(author))['works'];
        workInput.html( '<option value=""></option>' +
          works.map( (work: any) => { return `<option value="${work['workId']}">${work['workId']}: ${work['title'].substring(0, 80)}</option>` }).join('') );
        return {
          work: '',
          chunkNumber:  getIntVal(chunkNumberInput).toString(),
          lang: languageInput.val()
        }
      }
      return {
        work:getStringVal(workInput).trim(),
        chunkNumber: getIntVal(chunkNumberInput).toString(),
        lang: languageInput.val()
      }
    }
  }

  genGetBodyHtml() {
    return async () => {
      let languagesSelectHtml = '<select class="language-input">'  +
          this.systemLanguages.map((lang: any) => { return `<option value="${lang.code}">${tr(lang.name)}</option>` }).join('') +
         '</select>';

      let authors = await this.options.apiClient.getAuthors();
      let authorData = await Promise.all( authors.map( (authorId:number) => { return this.options.apiClient.getPersonEssentialData(authorId); }) );
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
    return (data: any) => {
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