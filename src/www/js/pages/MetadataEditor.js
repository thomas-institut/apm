import {OptionsChecker} from "@thomas-inst/optionschecker";

export class MetadataEditor {

    constructor(options) {

        let optionsDefinition = {
            containerSelector: { type:'string', required: true},
            entityId: {type:'number', required: true},
            entityType: {type:'string', required: true},
            metadata: {type:'array', required: true},
            metadataSchema: {type: 'object', required: true},
            mode: {type:'string', required: true},
            callback: {type:'function', required: false},
            theme: {type:'string', required: true}
        }

        let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        // Fill container with the metadata editor html structure
        this.makeEditor(options.containerSelector)

        // Globals
        this.entity = {id: '', type: '', attributes: [], values: [], types: []}
        this.schemes = {types: [], attributes: [], placeholders: []}
        this.numAttributes = 0
        //this.idForNewEntity = 0
        this.mode = {create: 'create', edit: 'edit', show: 'show'}
        this.password1Selector = ''
        this.password2Selector = ''

        // Selectors
        this.buttons =  $('#buttons')

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
        $(container).html(
            `<br>
                            <table id="metadataTable"></table>
                            <br>
                            <div id="buttons"><comment id="confirmationMessage"></comment><comment id="errorMessage"></comment></div>
                            <br>`)
    }

    setupEditMode() {
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupSaveButton(this.options.mode)
                console.log(`Metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} can now be edited.`)
            })
        })
    }

    setupCreateMode() {
        this.buildEntity(() => {
            this.makeTableStructure()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupSaveButton(this.options.mode)
                console.log('A new entity can now be created.')
            })
        })
    }

    setupShowMode() {
        this.buildEntity(() => {
            this.makeTableStructure()
            this.showMetadata()
            console.log(`Metadata for entity of type '${this.entity.type}' with ID ${this.entity.id} are being displayed.`)
        })
    }

    // Entity Management
    buildEntity(callback) {
        this.entity.id = this.options.entityId
        this.entity.type = this.options.entityType
        this.entity.values = this.options.metadata
        this.entity.attributes = this.options.metadataSchema.attributes
        this.entity.types = this.options.metadataSchema.types

        // Store number of values
        this.numAttributes = this.entity.attributes.length

        callback()
    }

    // Table Design Management
    makeTableStructure() {
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
                for (let i=1; i<=this.numAttributes; i++) {
                    let id = "row" + i
                    $(tableSelector).append(`<tr id=${id}></tr>`)
                }
                break
        }
    }

    makeTableCells () {
        switch (this.options.theme) {
            case 'horizontal':
                for (let i = 1; i <= this.numAttributes; i++) {

                    let cellId = "entity_attr" + i
                    $('#row1').append(`<th>${this.entity.attributes[i-1]}</th>`)

                    $('#row2').append(`<td><div id=${cellId}></div></td>`)
                }
                break
            case 'vertical':
                for (let i = 1; i <= this.numAttributes; i++) {

                    let row = "#row" + i
                    let cellId = "entity_attr" + i
                    let attributeName = this.entity.attributes[i-1] + "&emsp;&emsp;"

                    $(row).append(`<th>${attributeName}</th>
                               <td><div id=${cellId}></div></td>`)
                }
                break
        }
    }

    // Table Data Management
    showMetadata () {
        this.clearTableCells()
        for (let i=1; i<=this.numAttributes; i++) {
            let id = "#entity_attr" + i
            $(id).append(this.entity.values[i-1])
        }
    }

    clearTableCells() {
        for (let i=1; i<=this.numAttributes; i++) {
            let id = "#entity_attr" + i
            $(id).empty()
        }
    }

    setupTableForDataInput(mode, callback) {

        this.setupAttributesForms()

        if (mode === this.mode.create) {
            callback()
        }
        else {
            this.fillAttributesForms()
            callback()
        }
    }

    setupAttributesForms() {
        for (let i=1; i<=this.numAttributes; i++) {
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
            <div class="help-block with-errors" id="passwordError1"></div>
        </div>
        <!-- Password confirmation -->
        <div class="form-group has-feedback">
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

    makeTextForm(selectorId, inputId, type) {
        $(selectorId).html(
            `<p><input type="text" class="form-control" id=${inputId} placeholder=${type} style="padding: unset"></p>`)
    }

     fillAttributesForms() {
        for (let i=1; i<=this.numAttributes; i++) {
            let id = "#entity_attr" + i + "_form"
            $(id).val(this.entity.values[i-1])
        }
    }

    // Save Button Setup
    setupSaveButton (mode) {
        this.buttons.prepend(
            `<button type="submit" class="btn btn-primary" id="save_button">Save</button>`)
        this.makeSaveButtonEvent(mode)
    }

    makeSaveButtonEvent (mode) {
        $("#save_button").on("click",  () => {

            // Clear Messages
            this.clearErrorMessage()
            this.clearConfirmationMessage()

            // Get Data To Save
            let d = this.getEntityDataToSave(mode)

            if (this.dataTypesAreCorrect(d) && this.passwordsAreCorrect()) {
                this.updateEntityData(d.id, d.type, d.values)
                this.options.callback(this.entity)
                this.returnConfirmation('Saved!')
            }
            else if (this.passwordsAreCorrect()) {
                this.returnDataTypeError()
            }
            else if (this.dataTypesAreCorrect(d)) {
                this.returnPasswordError()
            }
        })
    }

    updateEntityData(id, type, values) {
        this.entity.id = id
        this.entity.type = type
        this.entity.values = values
    }

    getEntityDataToSave(mode) {
        let id = this.entity.id
        let values = []
        let type = this.entity.type

        for (let i=1; i<=this.numAttributes; i++) {
            let name = "#entity_attr" + i + "_form"
            values.push($(name).val())
        }

        return {id: id, type: type, values: values}
    }

    // Validate Data before Saving
    dataTypesAreCorrect (d) {

        let index = 0
        for (let value of d.values) {
            let type = this.dataType(value)
            if (type !== this.entity.types[index] && this.entity.types[index] !== 'password' &&
                this.entity.types[index] !== 'year') { // Passwords and years do not need to undergo a check here
                this.mismatchedAttribute = this.entity.attributes[index]
                this.givenType = type
                this.affordedType = this.entity.types[index]
                return false
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
            return false
        }
    }

    dataType(value) {

        let type

        if (this.isMail(value)) {
            type = 'email'
        }
        else if (this.containsNumber(value)) {

            if (this.containsOnlyNumbers(value)) {
                type = 'number'
            }
            else if (this.isDate(value)) {
                type = 'date'
            }
            else {
                type = 'date_approx'
            }
        }
        else {
            type = 'text'
        }

        return type
    }

    isMail(str) {
        return /.+@.+\..+/.test(str)
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
    returnDataTypeError() {
        console.log('Data Type Error!')
        this.returnError(`Error! The given ${this.mismatchedAttribute} is of type '${this.givenType}' but has to be of type '${this.affordedType}'. Please try again.`)
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

    // DELETE? - API Call for New Entity ID
    getIdForNewEntity() {

        $.post(this.apiUrls.getIdForNewEntity).done((apiResponse) => {

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for metadata of entity with ID ${id}!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting metadata, please report to technical administrators.`)
                    .removeClass('text-error');
                return;
            }

            console.log(apiResponse);
            console.log(`ID for next entity to be created will be ${apiResponse.id}`)

            this.idForNewEntity = apiResponse.id

            return true
        })
    }







    // ------------------------------OUTDATED FUNCTIONS-------------------------------------
    clearButtons() {
        this.buttons.empty()
    }

    setupGetAndCreateButton() {
        this.buttons.append
        (`<button type="button" id="get_button" name="Get" style="background-color: white; padding: unset">Get Metadata</button>
              <button type="button" id="create_button" name="Create" style="background-color: white; padding: unset">Create New Entity</button>`)

        //this.makeGetButtonEvent()
        this.makeCreateButtonEvent()
    }

    setupGetEditAndCreateButton () {
        this.buttons.append
        (`<button type="button" id="get_button" name="Get" style="background-color: white; padding: unset">Get Metadata</button>
                <button type="button" id="edit_button" name="Edit" style="background-color: white; padding: unset">Edit Metadata</button>
                <button type="button" id="create_button" name="Create" style="background-color: white; padding: unset">Create New Entity</button>`)

        //this.makeGetButtonEvent()
        this.makeEditButtonEvent()
        this.makeCreateButtonEvent()
    }


    makeGetButtonEvent () {
        $("#get_button").on("click",  () => {
            this.clearButtons()
            this.clearEntityData()
            this.getMetadataByEntityId(5,() => {
                this.makeTableStructure()
                this.showMetadata()
                this.setupGetEditAndCreateButton()
                console.log(`Metadata for entity with ID ${this.entity.id} are being displayed.`)
            })
        })
    }

    makeCreateButtonEvent() {
        $("#create_button").on("click", () => {
            this.clearButtons()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupSaveButton(this.options.mode)
                console.log('Metadata for new entity can now be set.')
            })
        })
    }

    makeEditButtonEvent () {
        $("#edit_button").on("click", () => {
            this.clearButtons()
            this.setupTableForDataInput(this.options.mode, () => {
                this.setupSaveButton(this.options.mode)
                console.log(`Metadata for entity with ID ${this.entity.id} can now be edited.`)
            })
        })
    }


    makeCancelButtonEvent (mode) {
        $("#cancel_button").on("click",  () => {
            this.clearButtons()
            this.clearErrorMessage()
            this.clearTableCells()
            this.removeTableRows()
            if (mode === this.mode.create) {
                this.clearEntityData()
                this.setupGetAndCreateButton()
                console.log('Creation of new entity was canceled.')
            }
            else {
                this.makeTableStructure()
                this.showMetadata()
                this.setupGetEditAndCreateButton()
                console.log(`Editing of entity with ID ${this.entity.id} was canceled.`)
            }
        })
    }

    // Table Manipulation
    setupTypeSelector() {
        this.entity_type_cell.html(
            `<select id="entity_type_select">`)

        $("#entity_type_select").on("change", () => {
            let value = $("#entity_type_select").val()
            this.clearTableCells()
            this.removeTableRows()
            this.makeEntityFitToTypeSchema(value)
            this.makeTableStructure()
            this.setupTypeSelector()
            this.setupSelectorOptions(value)
            this.setupAttributesForms()
            console.log(`Adjusted table to chosen entity type "${value}".`)
        });
    }

    setupSelectorOptions(value=this.schemes.types[0]) {
        let selector = $('#entity_type_select')
        $.each(this.schemes.types, (i, type) => {
            selector.append($('<option>', {
                value: type,
                text : type
            }))
        })
        selector.val(value)
    }

    removeTableRows() {
        for (let i=0; i<this.numAttributes; i++) {
            let row = "#row" + i
            $(row).remove()
        }
    }

    // Entity Data Management
    clearEntityData () {
        this.entity = {id: '', type: '', attributes: [], values: [], types: []}
    }

    makeEntityFitToTypeSchema(type=this.options.entityType) {
        let i = this.schemes.types.indexOf(type)
        this.entity.attributes = this.schemes.attributes[i]
        this.entity.types = this.schemes.placeholders[i]
        this.numAttributes = this.entity.attributes.length
    }

    // Api Calls
    getMetadataByEntityId (id, callback) {

        let apiData = {id: id}

        // Make API request
        $.post(this.apiUrls.getData, apiData).done((apiResponse) => {

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for metadata of entity with ID ${id}!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting metadata, please report to technical administrators.`)
                    .removeClass('text-error');
                return;
            }

            console.log(`Got metadata for entity with ID ${id}`)
            console.log(apiResponse);

            // Fill data-object with relevant data
            this.entity.id = apiResponse.data.id
            this.entity.type = apiResponse.data.type
            Object.entries(apiResponse.data.currentMetadata).forEach((data, index) => {
                this.entity.values[index] = data[1]
            })
            Object.entries(apiResponse.data.metadataSchema).forEach((data, index) => {
                this.entity.attributes[index] = data[0]
                this.entity.types[index] = data[1]
            })

            // Store number of values
            this.numAttributes = this.entity.attributes.length
            console.log(`Entity has ${this.numAttributes} attributes.`)

            callback()

            return true
        })

        return false
    }

    getDataSchemesForEntityTypes(callback) {

        $.post(this.apiUrls.getDataSchemesForEntityTypes).done((apiResponse) => {

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for entity types!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting entity types, please report to technical administrators.`)
                    .removeClass('text-error');
                return;
            }

            console.log(apiResponse)

            this.schemes.types = []
            Object.entries(apiResponse.data).forEach((element, index) => {
                this.schemes.types.push(element[0])
                this.schemes.attributes[index] = []
                this.schemes.placeholders[index] = []
                Object.entries(element[1]).forEach((item) => {
                    this.schemes.attributes[index].push(item[0])
                    this.schemes.placeholders[index].push(item[1])
                })
            })

            callback()

            return true
        })
    }

    saveMetadata (id, type, values) {

        let apiData = {id: id, type: type, values: values}
        this.setMetadata(this.apiUrls.saveData, apiData)
    }

    createEntity (id, type, values) {

        type = 'user'
        let apiData = {id: id, type: type, values: values}
        this.setMetadata(this.apiUrls.createEntity, apiData)
    }

    setMetadata (apiUrl, apiData) {

        $.post(apiUrl, apiData).done((apiResponse) => {

            console.log(apiResponse);

            // Catch errors
            if (apiResponse.status !== 'OK') {
                console.log(`Error in query for metadata of entity with ID ${apiData.id}!`);
                if (apiResponse.errorData !== undefined) {
                    console.log(apiResponse.errorData);
                }
                errorMessageDiv.html(`Error while getting metadata, please report to technical administrators.`)
                    .removeClass('text-error');
            }
            else {

                if (apiUrl === this.apiUrls.createEntity) {
                    this.returnConfirmation('Created!')
                    console.log(`Created entity with ID ${apiData.id}`)
                }
                else {
                    this.returnConfirmation('Saved!')
                    console.log(`Saved metadata for entity with ID ${apiData.id}`)
                }
            }

        })
    }
}

// Load as global variable so that it can be referenced in the Twig template
window.MetadataEditor = MetadataEditor
