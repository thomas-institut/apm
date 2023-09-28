import {MetadataEditor} from "./MetadataEditor";

let urlGen = new ApmUrlGenerator('')
let entity = {}

export function setupPeopleManagerPage (baseUrl) {

    urlGen.setBase(baseUrl)

    // Determine editor mode and entity id
    let mode = 'show'
    let id = '77'

    // Show spinner while loading
    makeSpinner()

    // setup metadatas editor in desired mode
    switch (mode) {
        case 'create':
            getPersonSchemaWithNewId((entity) => {
                setupMetadataEditor(entity, mode)
            })
            break
        default:
            getPerson(id, (entity) => {
                setupMetadataEditor(entity, mode)
            })
            break
    }
}

window.setupPeopleManagerPage = setupPeopleManagerPage

function setupMetadataEditor (entity, mode) {

    removeMetadataEditor()
    let mde = new MetadataEditor({
        containerSelector: 'peopleEditor',
        entityId: entity.id,
        entityType: entity.type,
        metadata: entity.values,
        metadataSchema: {keys: entity.keys, types: entity.types},
        callbackSave: (data, returnConfirmation) => {savePersonData(data, returnConfirmation)},
        callbackCreate: () => {getPersonSchemaWithNewId(entity)},
        mode: mode,
        theme: 'vertical'
    })
    
}

function removeMetadataEditor() {
    $('#peopleEditor').empty()
}


function getPerson (id, setupMetadataEditor) {
    // Make API Call
    $.post(urlGen.apiPeopleManagerGetData(), {id: id})
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

function getPersonSchemaWithNewId (setupMetadataEditor) {
    // Make API Call
    $.post(urlGen.apiPeopleManagerGetSchema())
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

function savePersonData (data, returnConfirmation) {

    // Make API Call
    $.post(urlGen.apiPeopleManagerSaveData(), data)
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
            returnConfirmation()
            entity = data
            setupMetadataEditor(entity, 'show')
            return true
        })
        .fail((status) => {
            console.log(status);
        })
}

function makeSpinner() {
    removeMetadataEditor()
    $('#peopleEditor').html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue"></div>`)
}
