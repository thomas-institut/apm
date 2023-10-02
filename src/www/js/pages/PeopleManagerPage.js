import {MetadataEditor} from "./MetadataEditor";

let urlGen = new ApmUrlGenerator('')
let entity = {}

export function setupPeopleManagerPage (baseUrl) {

    urlGen.setBase(baseUrl)

    // Determine editor mode and entity id
    let mode = 'show'
    let id = '111'

    // Show spinner while loading
    makeSpinner()

    // setup metadata editor in desired mode
    switch (mode) {
        case 'create':
            getPersonSchema((entity) => {
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

function makeSpinner() {
    removeMetadataEditor()
    $('#peopleEditor').html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue"></div>`)
}

function setupMetadataEditor (entity, mode) {

    removeMetadataEditor()
    let mde = new MetadataEditor({
        containerSelector: 'peopleEditor',
        entityId: entity.id,
        entityType: entity.type,
        metadata: entity.values,
        metadataSchema: {keys: entity.keys, types: entity.types},
        callbackSave: (data, mode, callback) => {
            savePersonData(data, mode, callback)
        },
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

function getIdForNewPerson(data, saveEntity) {
    $.post(urlGen.apiPeopleManagerGetNewId())
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

function getPersonSchema (setupMetadataEditor) {
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

function savePersonData (data, mode, callback) {

    if (mode === 'edit') {
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
                callback()
                entity = data
                setupMetadataEditor(entity, 'show')
                return true
            })
            .fail((status) => {
                console.log(status);
            })
    }
    else if (mode === 'create') {
        getIdForNewPerson(data, (newData) => {
            // Make API Call
            $.post(urlGen.apiPeopleManagerSaveData(), newData)
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
                    setupMetadataEditor(entity, 'show')
                    return true
                })
                .fail((status) => {
                    console.log(status);
                })
        })
    }
}
