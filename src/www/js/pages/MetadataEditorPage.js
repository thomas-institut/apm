import {MetadataEditor} from "../MetadataEditor/MetadataEditor";
import {NormalPage} from "./NormalPage";
import {tr} from "./common/SiteLang";
import {OptionsChecker} from "@thomas-inst/optionschecker";
import { Tid } from '../Tid/Tid'

let urlGen = new ApmUrlGenerator('')
let entity = {}

export class MetadataEditorPage extends NormalPage {
  constructor(options) {
    super(options)
    let oc = new OptionsChecker({
      context: 'MetadataEditorPage',
      optionsDefinition: {
        id: { type: 'number', required: true},
      }
    });

    let cleanOptions = oc.getCleanOptions(options);
    this.id = cleanOptions.id;

    console.log(`Metadata Editor Page`)
    console.log(options)

    this.initPage().then(() => {
      console.log(`Metadata Editor Page initialized`)
    })
  }

  async initPage() {
    await super.initPage()
    document.title = tr('Metadata Editor Page');
    this.entityData = await this.getEntityData();
    console.log('Entity Data', this.entityData);
    this.type = this.entityData.type;
    this.entityInfoDiv = $('div.entity-info');
    this.entityInfoDiv.html(this.getEntityInfoHtml(this.entityData));
    this.schema = await this.getEntitySchema();
    console.log(`Entity Schema for type ${this.type}`, this.schema);
    this.setupMetadataEditor('show', this.schema, this.entityData);
  }

  getEntityInfoHtml(data) {
    return `<p><b>Entity ID:</b> ${data.id} (${Tid.toBase36String(data.id)})</p>
    <p><b>Type</b>: ${data.type}</p>
    <p><b>Name</b>: ${data.name}</p>
    `
  }

  async genContentHtml() {
    return `<h2>Development Entity Data Editor</h2>

    <div class="entity-info">
        Loading data...
    </div>
    
    <h4>API Call Control</h4>
    <div class="api-call-control"></div>
    
    <h4>Editor Container</h4>
    <div class="editor-container"></div>
    <br>`
  }
  setupMetadataEditor (mode, schema, entityData=[]) {
      this.metadataEditor = new MetadataEditor({
        containerSelector: 'div.editor-container',
        entityDataSchema: schema,
        entityData: entityData,
        mode: mode,
        onSave: this.genMetadataEditorSave(),
      })

  }

  async getEntityData() {
    return this.apmDataProxy.fetch(urlGen.apiEntityGetData(this.id), 'GET', {},true, true);
  }

  getEntitySchema () {
    return this.apmDataProxy.fetch(urlGen.apiEntityGetSchema(this.type), 'GET', {},true, true);
  }

  getIdForNewPerson(data, saveEntity) {
    $.post(urlGen.apiPeopleGetNewId())
      .done((apiResponse) => {

        // Catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          if (apiResponse.errorData !== undefined) {
            console.log(apiResponse.errorData);
          }
          return false
        }
        else {
          console.log(apiResponse)
          data.id = apiResponse.id
          saveEntity(data)
        }

      })
      .fail((status) => {
        console.log(status);
        return false
      })
  }

  genMetadataEditorSave() {
    return async (data, mode) => {
      console.log(`Save, mode ${mode}`, data);
    }
  }
  savePersonData (data, mode) {


    // if (mode === 'edit') {
    //   // Make API Call
    //   $.post(urlGen.apiPeopleSaveData(), data)
    //     .done((apiResponse) => {
    //
    //       // Catch Error
    //       if (apiResponse.status !== 'OK') {
    //         console.log(`Error in query`);
    //         if (apiResponse.errorData !== undefined) {
    //           console.log(apiResponse.errorData);
    //         }
    //         return;
    //       }
    //
    //       // Log API response and change to show mode
    //       console.log(apiResponse);
    //       callback()
    //       entity = data
    //       return true
    //     })
    //     .fail((status) => {
    //       console.log(status);
    //     })
    // }
    // else if (mode === 'create') {
    //   this.getIdForNewPerson(data, (newData) => {
    //     // Make API Call
    //     $.post(urlGen.apiPeopleSaveData(), newData)
    //       .done((apiResponse) => {
    //
    //         // Catch Error
    //         if (apiResponse.status !== 'OK') {
    //           console.log(`Error in query`);
    //           if (apiResponse.errorData !== undefined) {
    //             console.log(apiResponse.errorData);
    //           }
    //           return;
    //         }
    //
    //         // Log API response and change to show mode
    //         console.log(apiResponse);
    //         callback()
    //         entity = newData
    //         return true
    //       })
    //       .fail((status) => {
    //         console.log(status);
    //       })
    //   })
    // }
  }
}

window.MetadataEditorPage = MetadataEditorPage