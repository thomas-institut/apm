import { MetadataEditor, Mode_Show } from '../MetadataEditor/MetadataEditor'
import {NormalPage} from "./NormalPage";
import {tr} from "./common/SiteLang";
import {OptionsChecker} from "@thomas-inst/optionschecker";
import { Tid } from '../Tid/Tid'
import { urlGen } from './common/SiteUrlGen'
import { MetadataEditor2 } from '../MetadataEditor/MetadataEditor2'
import { MetadataEditorSchema } from '../defaults/MetadataEditorSchemata/MetadataEditorSchema'


export class DevelopmentEntityDataEditor extends NormalPage {
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
    document.title = tr('Entity Editor Page');
    this.entityData = await this.getEntityData();
    console.log('Entity Data', this.entityData);
    this.entityType = this.entityData.type;
    this.entityInfoDiv = $('div.entity-info');
    this.entityInfoDiv.html(this.getEntityInfoHtml(this.entityData));
    this.schema = MetadataEditorSchema.getSchema(this.entityType);
    console.log(`Entity Schema for type ${this.entityType}`, this.schema);

    this.metadataEditor = new MetadataEditor({
      containerSelector: 'div.editor-container-lukas',
      entityDataSchema: this.schema,
      entityData: this.entityData,
      mode: Mode_Show,
      getEntityName: async (id) => {
        const data = await this.apmDataProxy.getEntityData(id);
        return data.name;
      },
      onSave: this.genMetadataEditorSave(),
    });
    this.metadataEditorNew = new MetadataEditor2({
      containerSelector: 'div.editor-container-new',
      entityDataSchema: this.schema,
      entityData: this.entityData,
      apmDataProxy: this.apmDataProxy,
    });

  }

  getEntityInfoHtml(data) {
    let apmUrl = urlGen.siteEntityPage(data.type, data.id);
    return `<p><b>Entity ID:</b> ${data.id} (${Tid.toBase36String(data.id)})</p>
    <p><b>Type</b>: ${data.type}</p>
    <p><b>Name</b>: ${data.name}</p>
    <p><b>Apm Url</b>: <a href="${apmUrl}">${apmUrl}</a></p>
    `
  }

  async genContentHtml() {
    return `<h2>Development Entity Data Editor</h2>

    <div class="entity-info">
        Loading data...
    </div>
    
    <h4>API Call Control</h4>
    <div class="api-call-control"></div>
    
    <h4>Editor New</h4>
    <div class="editor-container  editor-container-new"></div>
    
    <h4>Editor Lukas</h4>
    <div class="editor-container editor-container-lukas"></div>
    `
  }

  async getEntityData() {
    return this.apmDataProxy.fetch(urlGen.apiEntityGetData(this.id), 'GET', {},true, true);
  }

  getEntitySchema () {
    return this.apmDataProxy.fetch(urlGen.apiEntityGetSchema(this.entityType), 'GET', {},true, true);
  }

  genMetadataEditorSave() {
    return async (data, mode) => {
      console.log(`Save, mode ${mode}`, data);
    }
  }

}

window.DevelopmentEntityDataEditor = DevelopmentEntityDataEditor