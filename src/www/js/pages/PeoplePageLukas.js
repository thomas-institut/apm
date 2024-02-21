let urlGen = new ApmUrlGenerator('')
let numPersons = 0

export function setupPeoplePage (baseUrl) {

  urlGen.setBase(baseUrl)

  makeCreateButton()
  makeSpinner()
  makeTable(() => {
    removeSpinner()
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
  let peopleTableHeadRow = $('#people-table-head')
  let keysToShow = ['ID', 'Display Name', 'Partner', 'URL']

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
        let people = apiResponse.data

        if (people[0].length === 0) {
          removeSpinner()
          return false
        }

        for (let person of people) {
          let row = 'row' + person.id
          let rowSelector = '#' + row
          peopleTableBody.append(`<tr id=${row}></tr>`)

          for (let key of keysToShow) {
            let value = getValueByKey(people, person, key)
            $(rowSelector).append(`<td>${value}</td>`)
          }
          numPersons = numPersons+1
        }

        for (let key of keysToShow) {
          peopleTableHeadRow.append(`<th>${key}</th>`)
        }

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

function getNameWithLink (id, name) {
  let url = urlGen.sitePerson(id)
  let linkId = "linktoperson" + id
  return `<a id=${linkId} class="nav-link" target="_blank" href=${url}>${name}</a>`
}

function getValueByKey(people, person, key) {
  let keys = person.keys
  let values = person.values
  let i = keys.indexOf(key)

  if (key === 'ID') {
    return person.id
  } else if (i === -1) {
    return `Entity has no key '${key}'`
  } else if (key === 'Display Name') {
    return getNameWithLink(person.id, values[i])
  } else if (person.types[i].includes('person') && values[i] !== '') {
    let linkedPerson = people[values[i]]
    let name = getValueByKey(people, linkedPerson, 'Display Name')
    return getNameWithLink(linkedPerson.id, name)
  } else {
    return values[i]
  }
}