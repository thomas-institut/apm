let urlGen = new ApmUrlGenerator('')
let numPersons = 0

export function setupPeoplePage (baseUrl) {

    urlGen.setBase(baseUrl)

    makeSpinner()
    makeTable(() => {
        removeSpinner()
        makeCreateButton()
    })

}

window.setupPeoplePage = setupPeoplePage

function makeSpinner() {
    $('#table-spinner').html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue"></div>`)
}

function removeSpinner() {
    $('#table-spinner').empty()
}

function makeTable(callback) {

    let peopleTable = $('#people-table')
    // Make API Call
    $.post(urlGen.apiPeopleGetAllPeople())
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
                for (let person of apiResponse.data) {
                    let name = getNameWithLink(person)
                    peopleTable.append(`<tr><td>${person.id}</td><td>${name}</td></tr>`)
                    numPersons = numPersons+1
                }
                peopleTable.prepend(`<thead><tr><th>ID</th><th>Name</th></thead>`)

                callback()
                return true
            }

        })
        .fail((status) => {
            console.log(status);
            return false
        })
}

function makeCreateButton() {
    $('#div_create_button').html(
        `<button type="submit" class="btn btn-primary" id="create_button" 
                            onClick = "window.location.href='${urlGen.sitePerson('create')}';">Add Person</button>`)
}

function getNameWithLink (person) {
    let id = person.id
    let name = person.values[0]
    let url = urlGen.sitePerson(id)
    let linkId = "linktoperson" + id
    return `<a id=${linkId} class="nav-link" href=${url} >${name}</a>`;
}