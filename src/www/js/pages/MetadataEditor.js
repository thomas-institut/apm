import {OptionsChecker} from "@thomas-inst/optionschecker";
import {urlGen} from "./common/SiteUrlGen";

export class MetadataEditor {

    constructor(options) {

        const optionsDefinition = {
            containerSelector: { type:'string', required: true},
            entityId: {type:'string', required: true},
            entityType: {type:'string', required: true},
            metadata: {type:'array', required: false, default: []},
            metadataSchema: {type: 'object', required: true},
            mode: {type:'string', required: true},
            callbackSave: {type:'function', required: true},
            theme: {type:'string', required: true},
            backlink: {type:'string', required: false, default: ''}
        }

        const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        // Fill container with the metadata editor html structure
        this.makeEditor(options.containerSelector)

        // Globals
        this.entity = {id: '', type: '', keys: [], values: [], types: []}
        this.numKeys = 0
        this.mode = {create: 'create', edit: 'edit', show: 'show'}

        // Selectors
        this.buttonsSelectorTop = 'buttons_top'
        this.buttonsSelectorBottom = 'buttons_bottom'

        // Get list of all people (esp. for handling of entities as values, saving their ids, showing their names) and setup metadata editor in desired mode
        this.getPeople((people) => {
            this.people = people
            switch (this.options.mode) {
                case this.mode.edit:
                    this.setupEditMode()
                    break
                case this.mode.create:
                    this.setupCreateMode()
                    break
                case this.mode.show:
                    this.setupShowMode()
                    break
            }
        })
    }

    // FUNCTIONS
    // Setup Editor
    makeEditor(container) {
        container = "#" + container

        let tableClass
        switch (this.options.theme) {
            case 'vertical':
                tableClass = 'table'
                break
            case 'horizontal':
                tableClass = 'dataTable'
                break
        }
        $(container).html(
            `<br>
                            <div id="buttons_top" align="right"></div>
                            <br>
                            <table class=${tableClass} id="metadataTable"></table>
                            <br>
                            <div id="buttons_bottom" align="left"></div>
                            <div id="errorMessage" style="font-style: oblique"></div>
                            <br>`)
    }

    setupEditMode() {
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupCancelButton()
                this.setupSaveButton()
                console.log(`edit-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`)
            })
        })
    }

    setupCreateMode() {
        this.buildEntitySchema(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupSaveButton()
                this.makeBackButton()
                console.log(`create-mode for new entity of type '${this.entity.type}' activated.`)
            })
        })
    }

    setupShowMode() {
        this.removeSpinner()
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupBackAndEditButton()
            this.showMetadata()
            console.log(`show-mode for metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} activated.`)
        })
    }

    // Entity Management
    buildEntity(callback) {
        this.entity.id = this.options.entityId
        this.entity.type = this.options.entityType
        if (this.entity.values.length === 0) { // After having edited and saved values, they get updated via the updateEntityData function
            this.entity.values = this.options.metadata
        }
        this.entity.keys = this.options.metadataSchema.keys
        this.entity.types = this.options.metadataSchema.types

        // Store number of values
        this.numKeys = this.entity.keys.length

        callback()
    }

    buildEntitySchema(callback) {
        this.entity.id = this.options.entityId
        this.entity.type = this.options.entityType
        this.entity.keys = this.options.metadataSchema.keys
        this.entity.types = this.options.metadataSchema.types

        // Store number of values
        this.numKeys = this.entity.keys.length

        callback()
    }

    // Table Design Management
    makeTableStructure() {
        this.clearTable()
        this.makeTableRows()
        this.makeTableCells()
    }

    makeTableRows() {
        let tableSelector = '#metadataTable'

        switch (this.options.theme) {
            case 'horizontal':
                $(tableSelector).append(`<tr id="row1"></tr><tr id="row2"></tr>`)
                break
            case 'vertical':
                for (let i=1; i<=this.numKeys; i++) {
                    let id = "row" + i
                    $(tableSelector).append(`<tr id=${id}></tr>`)
                }
                break
        }
    }

    makeTableCells () {
        switch (this.options.theme) {
            case 'horizontal':
                for (let i = 1; i <= this.numKeys; i++) {

                    let cellId = "entity_attr" + i
                    $('#row1').append(`<th>${this.entity.keys[i-1]}</th>`)

                    $('#row2').append(`<td><div id=${cellId}></div></td>`)
                }
                break
            case 'vertical':
                for (let i = 1; i <= this.numKeys; i++) {

                    let row = "#row" + i
                    let cellId = "entity_attr" + i
                    let keyName = this.entity.keys[i-1] + "&emsp;&emsp;"

                    $(row).append(`<th style="vertical-align: top">${keyName}</th>
                               <td><div id=${cellId}></div></td>`)
                }
                break
        }
    }

    makeSpinner(container) {
        container = "#" + container
        $(container).html(`<div class="spinner-border" role="status" id="spinner" style="color: dodgerblue"></div>`)
    }

    removeSpinner() {
        $('#spinner').remove()
    }

    // Table Data Management
    showMetadata () {

        this.clearTableCells()
        this.removeSpinner()

        for (let i = 1; i <= this.numKeys; i++) {
            let id = "#entity_attr" + i
            let value = this.entity.values[i-1]
            let type = this.entity.types[i-1]

            if (type.includes('person')) {
                let url = urlGen.sitePerson(value)
                let linkId = "linktoperson" + value
                let name = this.getPersonNameById(value)
                let link = `<a id=${linkId} href=${url} >${name}</a>`
                $(id).append(link)
            } else if (Array.isArray(value)) {
                if (value.length === 3) {// Years Range with Note
                    value = this.formatYearsRange(value)
                } else if (value.length === 2) {
                    value = this.formatYear(value)
                }
                $(id).append(value)
            } else {
                $(id).append(value)
            }
        }
    }

    getPersonNameById (id) {
        return this.people[id].values[0]
    }

    formatYearsRange(value) {
        if (value[0] === "") {
            value = ""
        } else if (value[1] === "" && value[2] === "") {
            value = value[0]
        } else if (value[1] !== "" && value[2] === "") {
            value = value[0] + "-" + value[1]
        } else if (value[1] === "" && value[2] !== "") {
            value = value[0] + " (" + value[2] + ")"
        } else {
            value = value[0] + "-" + value[1] + " (" + value[2] + ")"
        }

        return value
    }

    formatYear(value) {
        if (value[0] !== '') {
            value = value[0] + " " + value[1]
        }
        else {
            value = ''
        }
        return value
    }

    clearTableCells() {
        for (let i=1; i<=this.numKeys; i++) {
            let id = "#entity_attr" + i
            $(id).empty()
        }
    }

    setupTableForDataInput(mode, callback) {

        this.setupInputFormsForKeys()

        if (mode === this.mode.create) {
            callback()
        }
        else {
            this.fillKeysForms()
            callback()
        }
    }

    setupInputFormsForKeys() {
        for (let i=1; i<=this.numKeys; i++) {
            let selectorId = "#entity_attr" + i
            let inputId = "entity_attr" + i + "_form"
            let type = this.entity.types[i-1][0] // first possible type of data, set in the corresponding schema, determines type of input form

            switch (type) {
                case 'password':
                    this.makePasswordForm(selectorId, inputId)
                    break
                case 'date':
                    this.makeDateForm(selectorId, inputId, type)
                    break
                case 'year':
                    this.makeYearForm(selectorId, inputId, type)
                    break
                case 'years_range':
                    this.makeYearsRangeForm(selectorId, inputId)
                    break
                case 'person':
                    this.makePersonForm(selectorId, inputId)
                    break
                default:
                    this.makeTextForm(selectorId, inputId, type)
            }
        }
    }

    makePersonForm(selector, inputId) {
        let list = inputId + "_list"
        let listSelector = "#" + list
        $(selector).html(`<p>
            <input class="form-control" list=${list} id=${inputId} placeholder="person" autoComplete="off" style="padding: unset">
                <datalist id=${list}></datalist></p>`)
        this.addItemsToList(this.people, listSelector)
    }

    addItemsToList(people, list) {
        for (let person of people) {
            let id = person.id
            let name = person.values[0]
            $(list).append(`<option value=${name} id=${id}>${name}</option>`)
        }
    }

    makePasswordForm(selector, inputId) {

        this.password1Selector = "#" + inputId
        this.password2Selector = "#password2"

        $(selector).html(
            `<form data-toggle="validator" role="form" id="theChangePasswordForm">
        <!-- Password -->
        <div class="form-group has-feedback">
            <input type="password" 
               class="form-control" 
               id=${inputId}
               name="password1"
               data-minlength="8"
               maxlength="16"
               placeholder="Password (8-16 characters)" required>
            <div class="help-block with-errors"></div>
        <!-- Password confirmation -->
            <input type="password" 
                   class="form-control" 
                   id="password2"
                   name="password2"
                   data-match=${this.password1Selector}
                   data-match-error="Passwords do not match"
                   placeholder="Confirm" required>
            <div class="help-block with-errors"></div>
        </div></form>`)
    }

    makeDateForm(selectorId, inputId, type) {
        $(selectorId).html(`<p><input type="date" class="form-control" id=${inputId} placeholder=${type} style="padding: unset"></p>`)
    }

    makeYearForm(selectorId, inputId, type) {
        let inputIdBcAd = inputId + "_" + "year_bc_ad"
        let inputIdBcADSelector = "#" + inputIdBcAd

        $(selectorId).html(`<p><input type="text" class="form-control" id=${inputId} placeholder=${type} style="padding: unset">
                                                                    <select class="form-control" id=${inputIdBcAd} style="padding: unset"></p>`)
        $(inputIdBcADSelector).append(`<option>BC</option><option selected>AD</option>`)
    }

    makeYearsRangeForm(selectorId, inputId) {

        let idYearsRangeEnd = inputId + "_years_range_end"
        let idYearsRangeNote = inputId + "_years_range_note"
        let currentYear = new Date().getFullYear()

        $(selectorId).html(`<select class="form-control" id=${inputId} style="padding: unset">`)
        $(selectorId).append(`<p><select class="form-control" id=${idYearsRangeEnd} style="padding: unset"></p>`)
        $(selectorId).append(`<p><textarea class="form-control" rows="2" id=${idYearsRangeNote} placeholder="Note"></textarea></p>`)

        let selectorYearsRangeStart = "#" + inputId
        let selectorYearsRangeEnd = "#" + idYearsRangeEnd

        $(selectorYearsRangeStart).append(`<option></option>`)
        $(selectorYearsRangeEnd).append(`<option></option>`)

        for (let i=-1000; i<=currentYear; i++) {
            $(selectorYearsRangeStart).append(`<option>${i}</option>`)
            $(selectorYearsRangeEnd).append(`<option>${i}</option>`)
        }
    }

    makeTextForm(selectorId, inputId, type) {
        $(selectorId).html(
            `<p><input type="text" class="form-control" id=${inputId} placeholder=${type} style="padding: unset"></p>`)
    }

     fillKeysForms() {
        for (let i=1; i<=this.numKeys; i++) {
            let id = "#entity_attr" + i + "_form"
            if (this.entity.types[i-1][0] === 'year') {
                let idYearBcAd = id + "_year_bc_ad"
                $(id).val(this.entity.values[i-1][0])
                $(idYearBcAd).val(this.entity.values[i-1][1])
            }
            else if (this.entity.types[i-1][0] === 'years_range') {
                let idYearsRangeEnd = id + "_years_range_end"
                let idYearsRangeNote = id + "_years_range_note"
                $(id).val(this.entity.values[i-1][0])
                $(idYearsRangeEnd).val(this.entity.values[i-1][1])
                $(idYearsRangeNote).val(this.entity.values[i-1][2])
            }
            else if (this.entity.types[i-1].includes('person')) {
                let name = this.getPersonNameById(this.entity.values[i-1])
                $(id).val(name)
            }
            else {
                $(id).val(this.entity.values[i-1])
            }
        }
    }

    // Save Button Setup
    setupSaveButton () {
        this.clearBottomButtons()
        let selector = '#' + this.buttonsSelectorBottom
        $(selector).prepend(
            `<button type="submit" class="btn btn-primary" id="save_button">Save</button>`)
        this.makeSaveButtonEvent()
    }

    setupBackAndEditButton() {
        this.clearTopButtons()
        this.makeEditButton()
        this.insertSpaceBetweenButtons()
        this.makeBackButton()
    }


    setupCancelButton() {
        this.clearTopButtons()
        this.makeCancelButton()
    }

    insertSpaceBetweenButtons() {
        let selector = '#' + this.buttonsSelectorTop
        $(selector).append(' ')
    }

    makeEditButton(){
        let selector = '#' + this.buttonsSelectorTop
        $(selector).append(
            `<a class="card-link" id="edit_button">Edit</a>`)
            //`<button type="submit" class="btn btn-primary" id="edit_button">Edit</button>`)

        this.makeEditButtonEvent()
    }

    makeCreateButton(){
        let selector = '#' + this.buttonsSelectorTop
        $(selector).append(
            `<button type="submit" class="btn btn-primary" id="create_button">Create</button>`)
        this.makeCreateButtonEvent()
    }

    makeCancelButton(){
        let selector = '#' + this.buttonsSelectorTop
        $(selector).append(
            `<a class="card-link" id="cancel_button">Cancel</a>`)
            //`<button type="submit" class="btn btn-primary" id="cancel_button">Cancel</button>`)
            this.makeCancelButtonEvent()
    }

    makeBackButton() {
        if (this.options.backlink !== '') {
            let selector = '#' + this.buttonsSelectorTop
            $(selector).append(
                `<a class="card-link" id="back_button" href = ${this.options.backlink}>Back</a>`)
                //`<button type="submit" class="btn btn-primary" id="back_button" onClick = "window.location.href='${this.options.backlink}';">Back</button>`)
        }
    }
    
    makeSaveButtonEvent () {
        $("#save_button").on("click",  () => {

            // Clear Messages
            this.clearErrorMessage()

            // Get Data To Save
            let d = this.getEntityDataToSave()

            if (this.validateData(d) && this.validatePasswords()) {
                this.makeSpinner(this.buttonsSelectorBottom)
                this.updateEntityData(d.id, d.type, d.values)
                this.options.callbackSave(this.entity, this.options.mode, () => {
                    this.logSaveAction(this.options.mode)
                    this.setupShowMode()
                })
            }
        })
    }

    makeEditButtonEvent() {
        $("#edit_button").on("click",  () => {

            this.options.mode = this.mode.edit

            // Clear Messages
            this.clearErrorMessage()
            this.setupEditMode()
        })
    }

    makeCreateButtonEvent() {

        this.options.mode = this.mode.create

        $("#create_button").on("click",  () => {
            this.clearErrorMessage()
            this.setupCreateMode()
        })
    }

    makeCancelButtonEvent() {
        $("#cancel_button").on("click",  () => {

            this.options.mode = this.mode.show

            // Clear Messages
            this.clearErrorMessage()
            this.clearBottomButtons()
            this.setupShowMode()
        })
    }

    updateEntityData(id, type, values) {
        this.entity.id = id
        this.entity.type = type
        this.entity.values = values
    }

    getEntityDataToSave() {
        let id = this.entity.id
        let values = []
        let type = this.entity.type

        for (let i=1; i<=this.numKeys; i++) {
            let name = "#entity_attr" + i + "_form"
            let value = $(name).val()

            if (this.entity.types[i-1].includes('year')) {
                let year = this.getDataForYear(name, value)
                values.push(year)
            }
            else if (this.entity.types[i-1].includes('years_range')) {
                let years = this.getDataForYearsRange(name, value)
                values.push(years)
            }
            else if (this.entity.types[i-1].includes('person')) {
                let datalist = "#entity_attr" + i + "_form_list"
                let person_id
                try {
                    person_id = $(`${datalist} option[value=${value}]`).attr('id')
                } catch {
                    person_id = ''
                }
                values.push(person_id)
            }
            else {
                values.push(value)
            }
        }
        return {id: id, type: type, values: values}
    }

    getDataForYearsRange(name, value) {
        let years = []
        let idYearsRangeEnd = name + "_years_range_end"
        let idYearsRangeNote = name + "_years_range_note"

        years.push(value)
        years.push($(idYearsRangeEnd).val())
        years.push($(idYearsRangeNote).val())

        return years
    }

    getDataForYear(name, value) {
        let year = []
        name = name + "_year_bc_ad"
        year.push(value)
        year.push($(name).val())

        return year
    }

    // Validate Data before Saving
    validateData (d) {

        let index = 0
        let date_birth = '0'
        let date_death = 'z'

        for (let value of d.values) {

            let key = this.entity.keys[index]
            let affordedTypes = this.entity.types[index]

            // Get dates of birth and death
            if (key === 'Date of Birth' && value !== '') {
                date_birth = value
            }
            if (key === 'Date of Death' && value !== '') {
                date_death = value
            }

            if (affordedTypes.includes('password') === false) {
                // Passwords do not need to undergo a check here

                let givenType = this.dataType(value)

                if ((affordedTypes.includes(givenType) === false && !(affordedTypes.includes('person') && givenType === 'number')) || value === undefined) { // Mismatching types throw an error, non existing person ids are marked as ,undefined‘ and will also be detected
                    this.returnDataTypeError(key, givenType, affordedTypes)
                    return false
                } else if (date_birth > date_death) {
                    this.returnImpossibleDatesError()
                    return false
                } else if (affordedTypes.includes('years_range')) {
                    if (parseInt(value[0]) > parseInt(value[1]) ||
                            (value[0] === '' && value[1] !== '') ||
                            (value[0] === '' && value[2] !== '')) {
                        this.returnImpossibleYearsRangeError(key)
                        return false
                    }
                }
                else {
                    index++
                }
            }
            else {
                index++
            }
        }

        return true
    }

    validatePasswords() {
        if ($(this.password1Selector).val() === $(this.password2Selector).val() && $(this.password1Selector).val() !== "") {
            return true
        }
        else {
            this.returnPasswordError()
            return false
        }
    }

    dataType(value) {

        let type

        if (value === undefined) {
            type = undefined
        }
        else if (Array.isArray(value)) {
            if (this.isYearsRange(value)) {
                type = 'years_range'
            }
            else if (this.isYear(value)) {
                type = 'year'
            }
            else {
                type = this.dataType(value[0])
            }
        }
        else if (this.isMail(value)) {
            type = 'email'
        }
        else if (this.isUrl(value)) {
            type = 'url'
        }
        else if (this.containsNumber(value)) {

            if (this.containsOnlyNumbers(value)) {
                type = 'number'
            }
            else if (this.isDate(value)) {
                type = 'date'
            }
            else {
                type = 'mixed'
            }
        }
        else if (value === "") {
            type = 'empty'
        }
        else {
            type = 'text'
        }

        return type
    }

    isYearsRange(value) {
        if (value.length === 3 && value[0] !== "") {
            return true
        }
        else {
            return false
        }
    }

    isYear(value) {
        if (value.length === 2 && value[0] !== "" && this.containsOnlyNumbers(value[0])) {
            return true
        }
        else {
            return false
        }
    }

    isMail(str) {
        return /.+@.+\..+/.test(str)
    }

    isUrl(str) {
        return /www\..+\..+/.test(str)
    }

    containsNumber(str) {
        return /\d/.test(str);
    }

    containsOnlyNumbers(str) {
        return /^\d+$/.test(str);
    }

    isDate(str) {
        return /.+-.+-.+/.test(str)
    }

    // User Communication
    returnDataTypeError(key, givenType, affordedTypes) {
        console.log('Data Type Error!')
        this.returnError(`Error! Given data for '${key}' is of type '${givenType}' but has to be of one of the types '${affordedTypes}'. Please try again.`)
    }

    returnImpossibleDatesError() {
        console.log('Impossible Dates Error!')
        this.returnError(`Error! Given date for 'Date of Birth' is after given date for 'Date of Death'. Please try again.`)
    }

    returnImpossibleYearsRangeError(key) {
        console.log('Impossible Years Range Error!')
        this.returnError(`Error! Given data for '${key}' are inconsistent. Please try again.`)
    }

    returnPasswordError() {
        console.log('Password Error!')
        this.returnError(`Password Error! Please try again.`)
    }

    returnError(str) {
        str = "&nbsp&nbsp" + str
        $("#errorMessage").html(str)
    }

    clearErrorMessage() {
        $("#errorMessage").empty()
    }

    logSaveAction(mode) {
        if (mode === this.mode.edit) {
            console.log(`Saved alterations of entity with ID ${this.entity.id}.`)
        }
        else if (mode === this.mode.create) {
            console.log(`Created new entity of type '${this.entity.type}' with ID ${this.entity.id}.`)
        }
    }

    clearTopButtons() {
        let selector = '#' + this.buttonsSelectorTop
        $(selector).empty()
    }

    clearBottomButtons() {
        let selector = '#' + this.buttonsSelectorBottom
        $(selector).empty()
    }

    clearTable() {
        let tableSelector = '#metadataTable'
        $(tableSelector).empty()
    }

    // API Calls
    getPeople(callback) {
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

                    callback(apiResponse.data)
                }

            })
            .fail((status) => {
                console.log(status);
                return false
            })
    }
}

// Load as global variable so that it can be referenced in the Twig template
window.MetadataEditor = MetadataEditor
