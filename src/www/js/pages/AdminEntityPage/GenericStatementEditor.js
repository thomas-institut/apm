import { ConfirmDialog } from '../common/ConfirmDialog'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { urlGen } from '../common/SiteUrlGen'

export class GenericStatementEditor {
  constructor(options) {
    let oc = new OptionsChecker({
      context: 'GenericStatementEditor',
      optionsDefinition: {
        statementId : { type: 'number', default: null},
        editableParts : { type: 'array', required: true },
        subject: { type: 'number', default: null },
        predicate: { type: 'number', required: true},
        relation: { type: 'boolean', required: true },
        object: { type: 'string', default: null},
        canBeCancelled: { type: 'boolean', default:null},
        allowedQualifications: { type: 'array', default: [] },
        getEntityName: { type: 'function', default: async () => { return ''}},
        onSuccess: { type: 'function', default: () => { console.log('GenericStatementEditor: success')}}
      }
    });

    this.options = oc.getCleanOptions(options);
    console.log("Options", this.options);
    let [ editSubject, , editObject ] = this.options.editableParts;
    this.editSubject = editSubject;
    this.editObject = editObject;
    this.initialSubject = this.options.subject ?? '';
    this.initialObject =this.options.object ?? '';


    this.getBodyHtml().then( (bodyHtml) => {
      this.dialog = new ConfirmDialog({
        acceptButtonLabel: 'Save',
        title: this.options.statementId === null ? "Create New Statement" : "Edit Statement",
        body: bodyHtml,
        hideOnAccept: false,
      })
      this.dialog.hideAcceptButton();

      this.subjectInput = editSubject ? $(`${this.dialog.getSelector()} .subject-input`) : null;
      this.objectInput = editObject ?  $(`${this.dialog.getSelector()} .object-input`) : null;
      this.editorialNoteInput = $(`${this.dialog.getSelector()} .editorial-note`);
      this.info = $(`${this.dialog.getSelector()} .info`)
      if (this.subjectInput !== null) {
        this.subjectInput.on('keyup', this.genOnTextInputKeyUp());
      }
      if (this.objectInput !== null) {
        this.objectInput.on('keyup', this.genOnTextInputKeyUp());
      }
      this.editorialNoteInput.on('keyup', this.genOnTextInputKeyUp());
      this.genOnTextInputKeyUp()();
      this.dialog.setAcceptFunction(this.genAcceptFunction());
      this.dialog.show();
    })
  }

  getQualificationLabel(id) {
    switch(id) {
      case 4001: return 'Language';
      case 4002: return 'Sequence';
      case 4003: return 'From';
      case 4004: return 'Until';
      case 4005: return 'URL Type';
      case 4006: return 'ID Type';
      default: return '????';
    }
  }

  getQualificationInput(id, currentValue) {
    switch(id) {
      case 4003:
      case 4004:
        return `<input type="text" class="qualification-input qualification-${id}" value="${currentValue}">`

      default:
        return '';
    }
  }

  genOnTextInputKeyUp() {
    return () => {

      let currentSubject = this.subjectInput !== null ? this.subjectInput.val() : this.initialSubject.toString();
      let currentObject = this.objectInput !== null ? this.objectInput.val() : this.initialObject.toString();
      let currentEditorialNote = this.editorialNoteInput.val().trim();
      if (currentObject === this.initialObject.toString() && currentSubject === this.initialSubject.toString()) {
        this.dialog.hideAcceptButton();
        this.info.html('No change in data');
        return;
      }

      currentSubject = currentSubject.trim();
      currentObject = currentObject.trim();

      // console.log( "Values", [ currentSubject, currentObject, currentEditorialNote ] );
      let inputErrors = [];
      if (currentObject !== null) {
        if (currentObject === '') {
          inputErrors.push('Object cannot be empty');
        } else {
          if (this.options.relation && (isNaN(parseInt(currentObject)) || parseInt(currentObject) <= 0)) {
            inputErrors.push('Object must be a positive integer');
          }
        }

      }
      if (currentSubject !== null) {
        if (currentSubject === '') {
          inputErrors.push('Subject cannot be empty');
        } else {
          if (isNaN(parseInt(currentSubject)) || parseInt(currentSubject) <= 0) {
            inputErrors.push('Subject must be a positive integer');
          }
        }
      }
      if (currentEditorialNote === '') {
        inputErrors.push('Editorial note cannot be empty');
      }
      // console.log('Input errors', inputErrors);
      if (inputErrors.length === 0) {
        this.dialog.showAcceptButton();
        this.info.html('');
      } else {
        this.dialog.hideAcceptButton();
        this.info.html( inputErrors.join('</br>'));
      }
    }
  }

  genAcceptFunction() {
    return () => {
      console.log(`Click on accept `)
      let newSubject = this.subjectInput === null ? this.options.subject : parseInt(this.subjectInput.val().trim());
      let newObject = this.objectInput === null ? this.options.object : this.objectInput.val().trim();

      if (newSubject === undefined || newSubject === null || newSubject === '' || isNaN(newSubject))  {
         this.info("ERROR: Invalid subject");
         console.warn("Accept button click with invalid subject", newSubject);
         return;
      }

      if (newObject === undefined || newObject === null || newObject === '' || (this.options.relation && isNaN(newObject)))  {
        this.info("ERROR: Invalid object");
        console.warn("Accept button click with invalid object", newObject);
        return;
      }

      this.dialog.acceptButton.html("Saving...");
      this.dialog.acceptButton.prop('disabled', true);
      console.log(`Saving new ${this.options.relation ? 'object' : 'value'} [${newObject}], note '${this.editorialNoteInput.val().toString()}'`);

      let commands = [];
      if (this.options.statementId !== null && this.options.canBeCancelled) {
        commands.push({ command: 'cancel', statementId: this.options.statementId });
      }
      commands.push({
        command: 'create',
        subject: newSubject,
        predicate: this.options.predicate,
        object: this.options.relation ? parseInt(newObject) : newObject.toString(),
        editorialNote: this.editorialNoteInput.val().trim().toString()
      });

      console.log(`Commands for API`, commands);
      $.post(urlGen.apiEntityStatementsEdit(), JSON.stringify(commands)).then( (response) => {
        console.log("Success", response);
        if (response.success === true) {
          this.options.onSuccess();
        } else {
          this.info.html("Errors saving data:<br/>&nbsp;&nbsp;" +
            response['commandResults'].map( (r) => { return `[${r.errorCode}] ${r.errorMessage}`})
              .join("<br/>&nbsp;&nbsp;"));
          this.dialog.acceptButton.html("Save");
          this.dialog.acceptButton.prop('disabled', false);
        }
      }).catch( (response) => {
        console.error("Failure", response);
        this.info.html("Error saving data, check console.");
        this.dialog.acceptButton.html("Save");
        this.dialog.acceptButton.prop('disabled', false);
      })
    }
  }

  async getEntityLabel(id) {
    let name = await this.options.getEntityName(id);
    return `${id} ${name === '' ? '' : `[${name}]`}`
  }

  async getBodyHtml() {
    const textAreaCols = 60;

    let introLabel = this.options.statementId === null
      ? ''
      : 'This will cancel the given statement and will create a new one with the edited changes.';

    let objectLabel = this.options.relation ? 'Object' : 'Value';
    let objectInputHtml = this.options.relation && this.initialObject !== '' ? await this.getEntityLabel(this.initialObject) : this.initialObject;
    if (this.editObject) {
      if (this.options.relation) {
        objectInputHtml = `<input type="text" class="object-input" value="${this.initialObject}">`;
      } else {
        objectInputHtml = `<textarea class="object-input" rows="5" cols="${textAreaCols}">${this.initialObject}</textarea>`
      }
    }

    let qualificationsDivs = [];
    for (let i = 0; i < this.options.allowedQualifications.length; i++) {
      let qp = this.options.allowedQualifications[i];
      qualificationsDivs.push(`<div class="edit-label">${this.getQualificationLabel(qp)}</div>`);
      qualificationsDivs.push(`<div>${this.getQualificationInput(qp, '')}</div>`);
    }

    return `
        <div class="edit-intro">${introLabel}</div>
        <div class="edit-statement-grid">
            <div class="edit-label">Statement Id</div>
            <div>${this.options.statementId ?? '<em>new</em>'}</div>
            <div class="edit-label">Subject</div>
            <div>${this.editSubject ? `<input type="text" class="subject-input" value="${this.initialSubject}">` : 
              await this.getEntityLabel(this.initialSubject)}</div>
            <div class="edit-label">Predicate</div>
            <div>${await this.getEntityLabel(this.options.predicate)}</div>
            <div class="edit-label">${objectLabel}</div>
            <div>${objectInputHtml}</div>
            ${qualificationsDivs.join("\n")}
            <div class="edit-label">Editorial Note</div>
            <div><textarea class="editorial-note" rows="3" cols="${textAreaCols}"></textarea></div>
        </div>
        <div class="info"></div>
`

  }


}