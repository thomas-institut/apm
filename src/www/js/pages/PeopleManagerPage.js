import {MetadataEditor} from "./MetadataEditor";

let urlGen = new ApmUrlGenerator('')

export function setupPeopleManagerPage (baseUrl) {

    urlGen.setBase(baseUrl)

    let id = 0
    getPersonData(id, (entity) => {
        makeEditor(entity)
    })

    // let entity = {
    //     id: 0,
    //     type: 'person',
    //     keys: ['Display Name', 'Date of Birth', 'Place of Birth', 'Date of Death', 'Place of Death', 'URL'],
    //     types: ['text', 'date', 'text', 'date', 'text', 'url'],
    //     values: ['Lukas', '1992-01-21', 'Karlsruhe', '1982-07-22', 'Toronto', 'www.wikipedia.com']
    // }


}

window.setupPeopleManagerPage = setupPeopleManagerPage

function makeEditor (entity) {
    let mde = new MetadataEditor({
        containerSelector: 'peopleEditor',
        entityId: entity.id,
        entityType: entity.type,
        metadata: entity.values,
        metadataSchema: {attributes: entity.keys, types: entity.types},
        callback: (d) => {savePersonData(d)},
        mode: 'edit',
        theme: 'vertical'
    })
}

function getPersonData (id, callback) {
    // Make API Call
    $.post(urlGen.apiPersonManagerGetData(), {id: id})
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
                callback(apiResponse.data)
                return true
            }

        })
        .fail((status) => {
            console.log(status);
            return false
        })
}

function savePersonData (data) {

    // Make API Call
    $.post(urlGen.apiPersonManagerSaveData(), data)
        .done((apiResponse) => {

            // Catch Error
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                return;
            }

            // Log API response
            console.log(apiResponse);

        })
        .fail((status) => {
            console.log(status);
        })
}