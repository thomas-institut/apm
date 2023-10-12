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

    let peopleTableBody = $('#people-table-body')
    let peopleTableHead = $('#people-table-head')

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
                    peopleTableBody.append(`<tr><td>${person.id}</td><td>${name}</td><td>${person.values[5]}</td></tr>`)
                    numPersons = numPersons+1
                }
                peopleTableHead.append(`<tr><th>ID</th><th>Name</th><th>E-Mail</th></tr>`)

                formatTable()
                callback()

                return true
            }

        })
        .fail((status) => {
            console.log(status);
            return false
        })
}

function formatTable() {

    $('#people-table').DataTable({'paging': true, 'searching' : true})
    return true
}

function makeCreateButton() {

    $('#div_create_person').html(
        `<a id="create_person" class="card-link" href = ${urlGen.sitePerson('create')}>Create Person</a>`)
}

function getNameWithLink (person) {
    let id = person.id
    let name = person.values[0]
    let url = urlGen.sitePerson(id)
    let linkId = "linktoperson" + id
    return `<a id=${linkId} class="nav-link" href=${url} >${name}</a>`;
}