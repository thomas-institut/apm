import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './SiteLang'
import { ApmApiClient } from '@/Api/ApmApiClient'
import { ApmPage } from '../ApmPage'
import { wait } from '@/toolbox/wait'
import { GetDataAndProcessDialog } from './GetDataAndProcessDialog'
import * as Entity from '../../constants/Entity'
import {getIntVal, getStringVal} from "@/toolbox/UiToolBox";

export class DocumentCreationDialog {
  private options: any;
  private readonly debug: boolean;
  private dialog!: GetDataAndProcessDialog;

  constructor (options: any) {
    let oc = new OptionsChecker({
      context: 'DocumentCreationDialog',
      optionsDefinition: {
        successWaitTime: { type: 'number', default: 500},
        apiClient: { type: 'object', objectClass: ApmApiClient},
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
  getSelectHtml(classes: string[], defaultOption: any, options: any, allowNoSelection: boolean) {

    let nullOption = '';
    if (allowNoSelection) {
      let nullOptionSelected = (defaultOption === '' || defaultOption < 0 || defaultOption === null) ? 'selected' : '';
      nullOption = `<option value='0' ${nullOptionSelected}> </option>`
    }
    return `<select class="${classes.join(' ')}">${nullOption}${options.map( (tuple: any) => {
      let [ id, name] = tuple;
      let selected = id === defaultOption ? 'selected' : '';
      return `<option value='${id}' ${selected}>${name}</option>`
    }).join('')}</select>`
  }

  async createDocument(): Promise<any> {
    let languages = await this.options.apiClient.getAvailableLanguages();
    let docTypes = await this.options.apiClient.getAvailableDocumentTypes();
    let imageSources = await this.options.apiClient.getAvailableImagesSources();

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
      getDataFromForm: async (dialogSelector:string) => {
        let inputName = $(`${dialogSelector} input.name-input`);
        let data = {
          name: getStringVal(inputName).trim(),
          docType: getIntVal($(`${dialogSelector} .doc-type-input`)),
          docLang: getIntVal($(`${dialogSelector} .lang-input`)),
          imageSource: getIntVal($(`${dialogSelector} .image-source-input`)),
          imageSourceData: getStringVal($(`${dialogSelector} input.image-source-data-input`)).trim()
        };
        // console.log(`Data from form`, data);
        return data;
      },
      validateData: async (data:any) => {

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
      processData: (data:any, infoArea:any) => {
        return new Promise((resolve) => {
          let name = data['name'];
          let imageSource = data['imageSource'] !== 0 ? data['imageSource'] : null;
          let imageSourceData = data['imageSourceData'];
          if (imageSource === null) {
            imageSourceData = null;
          }
          infoArea.html(`<span class="text-info">${ApmPage.genLoadingMessageHtml(tr('Creating new document'))}</span>`)
          this.options.apiClient.createDocument(name, data['docType'], data['docLang'], imageSource, imageSourceData).then( (resp:any) => {
            infoArea.html(ApmPage.genLoadingMessageHtml(tr('Document successfully created, loading new document page')));
            wait(this.options.successWaitTime).then( () => {
              resolve({ success: true, result: resp });
            })
          }).catch( (resp:any) => {
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