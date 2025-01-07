import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './SiteLang'
import { ApmDataProxy } from './ApmDataProxy'
import { ApmPage } from '../ApmPage'
import { wait } from '../../toolbox/FunctionUtil.mjs'
import { GetDataAndProcessDialog } from './GetDataAndProcessDialog'
import * as Entity from '../../constants/Entity'

export class DocumentCreationDialog {
  constructor (options) {
    let oc = new OptionsChecker({
      context: 'DocumentCreationDialog',
      optionsDefinition: {
        successWaitTime: { type: 'number', default: 500},
        apmDataProxy: { type: 'object', objectClass: ApmDataProxy},
        debug: { type: 'boolean', default: true},
      }
    })

    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;
  }

  /**
   *
   * @param classes
   * @param defaultOption
   * @param options
   * @param allowNoSelection
   */
  getSelectHtml(classes, defaultOption, options, allowNoSelection) {

    let nullOption = '';
    if (allowNoSelection) {
      let nullOptionSelected = (defaultOption === '' || defaultOption < 0 || defaultOption === null) ? 'selected' : '';
      nullOption = `<option value='0' ${nullOptionSelected}> </option>`
    }
    return `<select class="${classes.join(' ')}">${nullOption}${options.map( (tuple) => {
      let [ id, name] = tuple;
      let selected = id === defaultOption ? 'selected' : '';
      return `<option value='${id}' ${selected}>${name}</option>`
    }).join('')}</select>`
  }

  async createDocument() {
    let languages = await this.options.apmDataProxy.getAvailableLanguages();
    let docTypes = await this.options.apmDataProxy.getAvailableDocumentTypes();
    let imageSources = await this.options.apmDataProxy.getAvailableImagesSources();

    this.dialog = new GetDataAndProcessDialog({
      title: tr('Create Document'),
      processButtonLabel: tr('Create Document'),
      getBodyHtml: () => {

        return `<div class="new-doc-edit-form" style="display: grid; grid-template-columns: 25% auto">
        <div class="new-doc-item">${tr('Title')}</div>
        <div class="new-doc-input-div"><input type="text" size="50" class="name-input"></div>
        <div class="new-doc-item">${tr('Document Type')}</div>
        <div class="type-div">${this.getSelectHtml(['doc-type-input'], Entity.DocTypeManuscript, docTypes, false)}</div>
        <div class="new-doc-item">${tr('Language')}</div>
        <div class="lang-div">${this.getSelectHtml(['lang-input'], Entity.LangArabic, languages, false)}</div>
         <div class="new-doc-item">${tr('Image Source')}</div>
        <div class="image-source-div">${this.getSelectHtml(['image-source-input'], Entity.ImageSourceBilderberg, imageSources, true)}</div>
         <div class="new-doc-item">${tr('Image Source Data')}</div>
        <div class="image-source-data-div"><input type="text" size="50" class="image-source-data-input"></div>
        
    </div>`;
      },
      initialData: { name: ''},
      getDataFromForm: async (dialogSelector) => {
        let inputName = $(`${dialogSelector} input.name-input`);
        let data = {
          name: inputName.val().trim(),
          docType: parseInt($(`${dialogSelector} .doc-type-input`).val()),
          docLang: parseInt($(`${dialogSelector} .lang-input`).val()),
          imageSource: parseInt($(`${dialogSelector} .image-source-input`).val()),
          imageSourceData: $(`${dialogSelector} input.image-source-data-input`).val().trim()
        };
        console.log(`Data from form`, data);
        return data;
      },
      validateData: async (data) => {

        if (data['name'] === '') {
          return `<span class="text-danger">Title should not be empty</span>`
        }
        if (data['imageSource'] !== 0) {
          if (data['imageSourceData'] === '') {
            return `<span class="text-danger">Image source data should not be empty</span>`
          }
        }
        return true;
      },
      processData: (data, infoArea) => {
        return new Promise((resolve) => {
          let name = data['name'];
          let imageSource = data['imageSource'] !== 0 ? data['imageSource'] : null;
          let imageSourceData = data['imageSourceData'];
          if (imageSource === null) {
            imageSourceData = null;
          }
          infoArea.html(`<span class="text-info">${ApmPage.genLoadingMessageHtml(tr('Creating new document'))}</span>`)
          this.options.apmDataProxy.createDocument(name, data['docType'], data['docLang'], imageSource, imageSourceData).then( (resp) => {
            infoArea.html(ApmPage.genLoadingMessageHtml(tr('Document successfully created, loading new document page')));
            wait(this.options.successWaitTime).then( () => {
              resolve({ success: true, result: resp });
            })
          }).catch( (resp) => {
            this.debug && console.log('Response', resp);
            let status = resp.status ?? -1;
            let errorMessage = resp.responseJSON.errorMsg ?? tr("Unknown error");
            infoArea.html(`<span class="text-danger">${tr('The server found an error')}: <b>(${status}) ${errorMessage}</b></span>`);
            resolve({ success: false});
          })
        })
      }
    })
    return this.dialog.process();
  }
}