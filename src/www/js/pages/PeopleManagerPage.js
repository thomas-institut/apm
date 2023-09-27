import {MetadataEditor} from "./MetadataEditor";

let urlGen = new ApmUrlGenerator('')
let entity = {}

export function setupPeopleManagerPage (baseUrl) {

    urlGen.setBase(baseUrl)

    // Determine editor mode via value of user input
    let mode = 'show'
    let id = '62'

    switch (mode) {
        case 'create':
            getPersonSchema((entity) => {
                makeModeSelector()
                makeEditor(entity, mode)
            })
            break
        default:
            getPerson(id, (entity) => {
                makeModeSelector()
                makeEditor(entity, mode)
            })
            break
    }
}

window.setupPeopleManagerPage = setupPeopleManagerPage

function makeModeSelector() {
    ($('#modeSelector')).html(`
        <select name="select-mode" id="select-mode" style="border: black; background-color: white; padding: unset;">
        <option value="show">Show</option>
        <option value="edit">Edit</option>
        <option value="create">Create</option>
        </select>`)

    makeSelectModeEvent()

}

function makeEditor (entity, mode) {
    let mde = new MetadataEditor({
        containerSelector: 'peopleEditor',
        entityId: entity.id,
        entityType: entity.type,
        metadata: entity.values,
        metadataSchema: {keys: entity.keys, types: entity.types},
        callback: (data, returnConfirmation) => {savePersonData(data, returnConfirmation)},
        mode: mode,
        theme: 'vertical'
    })

    $('#select-mode').val(mode)
}

function removeEditor() {
    $('#peopleEditor').empty()
}

function makeSelectModeEvent() {
    let modeSelector = $('#select-mode')

    modeSelector.on('change', function() {

        removeEditor()
        let mode = modeSelector.val()

        switch (mode) {
            case 'create':
                getPersonSchema((entity) => {
                    makeEditor(entity, mode)
                })
                break
            default:
                makeEditor(entity, mode)
                break
        }
    })
}

function getPerson (id, makeEditor) {
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
                makeEditor(apiResponse.data)
                entity = apiResponse.data
                return true
            }

        })
        .fail((status) => {
            console.log(status);
            return false
        })
}

function getPersonSchema (makeEditor) {
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
                makeEditor(apiResponse.data)
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
            removeEditor()
            makeEditor(entity, 'show')
            return true
        })
        .fail((status) => {
            console.log(status);
        })
}