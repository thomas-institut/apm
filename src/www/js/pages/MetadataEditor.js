import {OptionsChecker} from "@thomas-inst/optionschecker";

export class MetadataEditor {

    constructor(options) {

        const optionsDefinition = {
            containerSelector: { type:'string', required: true},
            entityId: {type:'string', required: true},
            entityType: {type:'string', required: true},
            metadata: {type:'array', required: false, default: []},
            metadataSchema: {type: 'object', required: true},
            mode: {type:'string', required: true},
            callbackSave: {type:'function', required: false},
            callbackCreate: {type:'function', required: false},
            theme: {type:'string', required: true}
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

        // Setup metadata editor in desired mode
        switch (this.options.mode) {
            case 'edit':
                this.setupEditMode()
                break
            case 'create':
                this.setupCreateMode()
                break
            case 'show':
                this.setupShowMode()
                break
        }

        // // UNUSED - Api Urls
        // this.urlGen = new ApmUrlGenerator('')
        // this.apiUrls = {
        //     getData: this.urlGen.apiMetadataEditorGetData(),
        //     saveData: this.urlGen.apiMetadataEditorSaveData(),
        //     createEntity: this.urlGen.apiMetadataEditorCreateEntity(),
        //     getIdForNewEntity: this.urlGen.apiMetadataEditorGetIdForNewEntity(),
        //     getDataSchemesForEntityTypes: this.urlGen.apiMetadataEditorGetDataSchemesForEntityTypes()
        // };
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
                            <div id="buttons_bottom" align="left"><comment id="confirmationMessage"></comment><comment id="errorMessage"></comment></div>
                            <br>`)
    }

    setupEditMode() {
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupCancelButton()
                this.setupSaveButton()
                console.log(`Metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} can now be edited.`)
            })
        })
    }

    setupCreateMode() {
        this.buildEntitySchema(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupCancelButton()
                this.setupSaveButton()
                console.log('A new entity can now be created.')
            })
        })
    }

    setupShowMode() {
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupEditAndCreateButton()
            this.showMetadata()
            console.log(`Metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} are being displayed.`)
        })
    }

    // Entity Management
    buildEntity(callback) {
        this.entity.id = this.options.entityId
        this.entity.type = this.options.entityType
        this.entity.values = this.options.metadata
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
        for (let i=1; i<=this.numKeys; i++) {
            let id = "#entity_attr" + i
            let value = this.entity.values[i-1]
            if (Array.isArray(value)) { // Years Range with Note
                value = value[0] + "-" + value[1] + ", " + value[2]
                $(id).append(value)
            } else {
                $(id).append(value)
            }
        }
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
            let type = this.entity.types[i-1]

            switch (type) {
                case 'password':
                    this.makePasswordForm(selectorId, inputId)
                    break
                case 'date':
                    this.makeDateForm(selectorId, inputId, type)
                    break
                case 'year':
                    this.makeYearForm(selectorId, inputId)
                    break
                case 'years_range':
                    this.makeYearsRangeForm(selectorId, inputId)
                    break
                default:
                    this.makeTextForm(selectorId, inputId, type)
            }
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

    makeYearForm(selectorId, inputId) {
        let inputSelector = "#" + inputId
        let currentYear = new Date().getFullYear()
        $(selectorId).html(
            `<p><select class="form-control" id=${inputId} style="padding: unset"></p>`)
        for (let i=-1000; i<=currentYear; i++) {
            $(inputSelector).append(`<option>${i}</option>`)
        }
    }

    makeYearsRangeForm(selectorId, inputIdYearsRangeStart) {

        let inputIdYearsRangeEnd = "years_range_end"
        let inputIdYearsRangeNote = "years_range_note"
        let currentYear = new Date().getFullYear()

        $(selectorId).html(`<select class="form-control" id=${inputIdYearsRangeStart} style="padding: unset">`)
        $(selectorId).append(`<p><select class="form-control" id=${inputIdYearsRangeEnd} style="padding: unset"></p>`)
        $(selectorId).append(`<p><textarea rows="2" cols="50" id=${inputIdYearsRangeNote} placeholder="Your Note For The Given Range of Years"></textarea></p>`)

        let selectorYearsRangeStart = "#" + inputIdYearsRangeStart
        let selectorYearsRangeEnd = "#" + inputIdYearsRangeEnd

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
            if (this.entity.types[i-1] === 'years_range') {
                $(id).val(this.entity.values[i-1][0])
                $('#years_range_end').val(this.entity.values[i-1][1])
                $('#years_range_note').val(this.entity.values[i-1][2])
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

    setupEditAndCreateButton() {
        this.clearTopButtons()
        this.makeEditButton()
        this.insertSpaceBetweenButtons()
        this.makeCreateButton()
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
            `<button type="submit" class="btn btn-primary" id="edit_button">Edit</button>`)
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
            `<button type="submit" class="btn btn-primary" id="cancel_button">Cancel</button>`)
        this.makeCancelButtonEvent()
    }

    makeSaveButtonEvent () {
        $("#save_button").on("click",  () => {

            // Clear Messages
            this.clearErrorMessage()
            this.clearConfirmationMessage()

            // Get Data To Save
            let d = this.getEntityDataToSave()

            if (this.dataTypesAreCorrect(d) && this.passwordsAreCorrect()) {
                this.makeSpinner(this.buttonsSelectorBottom)
                this.updateEntityData(d.id, d.type, d.values)
                this.options.callbackSave(this.entity, () => {
                    this.removeSpinner()
                    this.returnConfirmation('Saved!')
                })
            }
        })
    }

    makeEditButtonEvent() {
        $("#edit_button").on("click",  () => {

            this.options.mode = 'edit'

            // Clear Messages
            this.clearErrorMessage()
            this.clearConfirmationMessage()
            this.setupEditMode()
        })
    }

    makeCreateButtonEvent() {

        this.options.mode = 'create'

        $("#create_button").on("click",  () => {

            // Clear Messages
            this.clearErrorMessage()
            this.clearConfirmationMessage()
            this.setupCreateMode()
        })
    }

    makeCancelButtonEvent() {
        $("#cancel_button").on("click",  () => {

            this.options.mode = 'show'

            // Clear Messages
            this.clearErrorMessage()
            this.clearConfirmationMessage()
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

            if (this.entity.types[i-1] === 'years_range') {
                let years = this.getDataForYearsRange(value)
                values.push(years)
            }
            else {
                values.push(value)
            }
        }

        return {id: id, type: type, values: values}
    }

    getDataForYearsRange(value) {
        let years = []
        // let regex = /\d+/g;
        // let year
        // while ((year = regex.exec(str)) != null) {
        //     years.push(year[0])
        // }

        years.push(value)
        years.push($("#years_range_end").val())
        years.push($("#years_range_note").val())

        return years
    }

    // Validate Data before Saving
    dataTypesAreCorrect (d) {

        let index = 0
        for (let value of d.values) {

            let key = this.entity.keys[index]
            let affordedType = this.entity.types[index]

            if (affordedType !== 'password' && affordedType !== 'year' && affordedType !== 'years_range') {
                // Passwords and years do not need to undergo a check here

                let givenType = this.dataType(value)

                if (givenType !== affordedType) { // Empty values and mismatching types throw an error
                    this.returnDataTypeError(key, givenType, affordedType)
                    return false
                } else {
                    index++
                }
            }
            else {
                index++
            }
        }

        return true
    }

    passwordsAreCorrect() {
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

        if (this.isMail(value)) {
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
            type = 'emtpy'
        }
        else {
            type = 'text'
        }

        return type
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
    returnDataTypeError(key, givenType, affordedType) {
        console.log('Data Type Error!')
        this.returnError(`Error! Given data for '${key}' is of type '${givenType}' but has to be of type '${affordedType}'. Please try again.`)
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

    returnConfirmation(str) {
        str = "&nbsp&nbsp" + str
        $("#confirmationMessage").html(str)
    }

    clearConfirmationMessage() {
        $("#confirmationMessage").empty()
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
}

// Load as global variable so that it can be referenced in the Twig template
window.MetadataEditor = MetadataEditor
