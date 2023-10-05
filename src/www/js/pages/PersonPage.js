import {MetadataEditor} from "./MetadataEditor";

let urlGen = new ApmUrlGenerator('')
let entity = {}

export function setupPersonPage (baseUrl, id, mode='show') {

    urlGen.setBase(baseUrl)

    makeSpinner()
    if (mode === 'create') {
        getPersonSchema((entity) => {
            removeSpinner()
            setupMetadataEditor(entity, mode)
        })
    }
    else {
        getPerson(id, (entity) => {
            removeSpinner()
            setupMetadataEditor(entity, mode)
        })
    }
}

window.setupPersonPage = setupPersonPage

function makeSpinner() {
    removeMetadataEditor()
    $('#spinner').html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue"></div>`)
}

function removeSpinner() {
    $('#spinner').empty()
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
        theme: 'vertical',
        backLink: urlGen.sitePeopleManager()
    })
    
}

function removeMetadataEditor() {
    $('#peopleEditor').empty()
}


function getPerson (id, setupMetadataEditor) {

    // Make API Call
    $.post(urlGen.apiPeopleManagerGetPersonData(), {id: id})
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
