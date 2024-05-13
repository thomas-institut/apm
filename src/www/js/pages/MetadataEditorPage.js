import {MetadataEditor} from "../MetadataEditor/MetadataEditor";
import {NormalPage} from "./NormalPage";
import {tr} from "./common/SiteLang";
import {OptionsChecker} from "@thomas-inst/optionschecker";
import {ApmDataProxy} from "./common/ApmDataProxy";

let urlGen = new ApmUrlGenerator('')
let entity = {}

export class MetadataEditorPage extends NormalPage {
    constructor(options) {
        super(options)
        let oc = new OptionsChecker({
            context: 'MetadataEditorPage',
            optionsDefinition: {
                id: { type: 'string', required: true},
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
        document.title = tr('Metadata Editor Page')

        await Promise.all([
            this.setupMetadataEditorPage()
        ])
    }

setupMetadataEditorPage () {

  this.makeSpinner()
  if (this.id === 'create') {
      this.getPersonSchema((entity) => {
          this.removeSpinner()
          this.makePage()
          this.setupMetadataEditor(entity, this.id)
    })
  }
  else {
      this.getEntitySchema((genericSchema) => {
          this.getEntityData((genericEntityData) => {
              //this.getPerson(this.id, (entity) => {
                  this.removeSpinner()
                  this.makePage(genericEntityData.name)
                  this.setupMetadataEditor('show', genericSchema, genericEntityData)
              //})
          })
      })


    //   this.getPerson(this.id, (entity) => {
    //       this.removeSpinner()
    //       this.makePage(entity.values[0])
    //       this.setupMetadataEditor(entity, 'show')
    // })
  }

  return true;
}

async genContentHtml() {
        return `<nav aria-label="breadcrumb">
        <ol class="breadcrumb">
            <li class="breadcrumb-item active" id="nav_people"></li>
            <li class="breadcrumb-item" id="nav_person_name"></li>
        </ol>
    </nav>

    <h1 id="person-heading"></h1>
    <div id="spinner" align="center"></div>
    <div id="person-metadata-editor-container" align="center"></div>
    <br>`
    }

makePage(name='Person') {
  $('#person-heading').html(`${name}`)
  $('#nav_people').html(`<a href=${urlGen.sitePeople()}>People</a>`)
  $('#nav_person_name').html(`${name}`)
}

makeSpinner() {
    this.removeMetadataEditor()
  $('#spinner').html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue"></div>`)
}

removeSpinner() {
  $('#spinner').empty()
}


setupMetadataEditor (mode, genericSchema, genericEntityData) {

    this.removeMetadataEditor()
  let mde = new MetadataEditor({
    containerSelector: '#person-metadata-editor-container',
    callback: (data, mode, callback) => {
        this.savePersonData(data, mode, callback)
    },
    mode: mode,
    theme: 'vertical',
    sections: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
    genericSchema: genericSchema,
    genericEntityData: genericEntityData
  })
}

removeMetadataEditor() {
  $('#peopleEditor').empty()
}


getPerson (id, setupMetadataEditor) {

  // Make API Call
  $.post(urlGen.apiPeopleGetPerson(), {id: id.toString()})
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
        setupMetadataEditor(apiResponse.data)
        entity = apiResponse.data
        return true
      }

    })
    .fail((status) => {
      console.log(status);
      return false
    })
}

async getEntityData(callback) {
        let adp = new ApmDataProxy(0)
        let tid = 1638491084282
        let data = await adp.fetch(urlGen.apiEntityGetData(tid), 'GET', {},false, false);
        console.log(data)
        callback(data)
    }

    getEntitySchema (callback) {
        // Make API Call
        $.get(urlGen.apiGetEntitySchema(107))
            .done((apiResponse) => {

                console.log(apiResponse)
                callback(apiResponse)
                return apiResponse

            })
            .fail((status) => {
                console.log(status);
                return false
            })
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

getPersonSchema (setupMetadataEditor) {
  // Make API Call
  $.post(urlGen.apiPeopleGetSchema())
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
        setupMetadataEditor(apiResponse.data)
        return true
      }

    })
    .fail((status) => {
      console.log(status);
      return false
    })
}

savePersonData (data, mode, callback) {

  if (mode === 'edit') {
    // Make API Call
    $.post(urlGen.apiPeopleSaveData(), data)
      .done((apiResponse) => {

        // Catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          if (apiResponse.errorData !== undefined) {
            console.log(apiResponse.errorData);
          }
          return;
        }

        // Log API response and change to show mode
        console.log(apiResponse);
        callback()
        entity = data
        this.makePage(data.values[0]) // Updates heading with person name
        return true
      })
      .fail((status) => {
        console.log(status);
      })
  }
  else if (mode === 'create') {
      this.getIdForNewPerson(data, (newData) => {
      // Make API Call
      $.post(urlGen.apiPeopleSaveData(), newData)
        .done((apiResponse) => {

          // Catch Error
          if (apiResponse.status !== 'OK') {
            console.log(`Error in query`);
            if (apiResponse.errorData !== undefined) {
              console.log(apiResponse.errorData);
            }
            return;
          }

          // Log API response and change to show mode
          console.log(apiResponse);
          callback()
          entity = newData
          this.makePage(data.values[0]) // Updates heading with person name
          return true
        })
        .fail((status) => {
          console.log(status);
        })
    })
  }
}
}

window.MetadataEditorPage = MetadataEditorPage