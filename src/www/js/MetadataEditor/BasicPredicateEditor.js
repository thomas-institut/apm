import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../Tid/Tid'
import { ApmFormats } from '../pages/common/ApmFormats'
import { Statement } from '../EntityData/Statement'
import { wait } from '../toolbox/FunctionUtil.mjs'
import * as Entity from '../constants/Entity'
import { trimWhiteSpace } from '../toolbox/Util.mjs'
import { GetDataAndProcessDialog } from '../pages/common/GetDataAndProcessDialog'


const SubjectIcon = '<b class="mde-icon">Subject</b>';
const PredicateIcon = '<b class="mde-icon">Predicate</b>'
const ObjectIcon = '<b class="mde-icon">Object</b>'
const ValueIcon = '<b class="mde-icon">Value</b>'

export class BasicPredicateEditor {

  /**
   * Constructs a new BasicPredicateEditor.
   *
   * Options:
   *   * __predicateDefinition: the predicate's definition, as given the by APM's entity system
   *   * __containerSelector__: the JQuery selector for the editor
   *   * __statements__: an array of statements with the given predicate. No more than one must be active.
   *   * __label__: the label to show for the predicate. If empty or not given, the predicate's name from the
   *     predicateDefinition will be used
   *   * __logoUrl__: if present and not an empty string, the url will be used to display a logo instead of the
   *       label. The label will be used as the alternate text for a html IMG element.
   *   * __getObjectUrl__: a function that returns a promise to a URL to be used for the object of the predicate, if not given
   *       or if the promise resolves to null, no URL will be used.
   *   * __initialMode__: the editor's initial mode, 'show' or 'edit'. By default, the editor starts in 'show' mode.
   *   * __readOnly__: if true, the editor does not show edit and delete buttons. Default: false.
   *   * __getEntityName__: a function that takes an entity id and returns a promise to a string with the entity's name
   *   * __getEntityType__: a function that takes an entity id and returns a promise to the entity's type
   *   * __saveStatement__: a function that takes a statement object (see below) and returns a promise to an object
   *       with the save operation result, an error message if necessary and a new array of statements for
   *       the predicate:  *{ success: true|false, msg: string, statements: array}*
   *   * __cancelStatement__: a function that takes a statement id and returns a promise to an object with the result
   *       of the cancellation operation as in *saveStatement*
   * @param options
   */
  constructor (options) {


    const oc = new OptionsChecker({
      context: 'BasicPredicateEditor',
      optionsDefinition: {
        predicateDefinition: {
          type: 'object',
          required: true,
        },
        containerSelector: { type: 'string', required: true},
        statements: { type: 'Array', required: true},
        showLabel: {type: 'boolean', default: true},
        label: { type: 'string', default: ''},
        logoUrl: { type: 'string', default: ''},
        multiLineInput: { type: 'boolean', default: false},
        getObjectUrl: { type: 'function', default: async (object) => {
          this.debug && console.log('Fake get object url', object);
          return null;
        }},
        initialMode: { type: 'string', default: 'show'},
        readOnly: { type: 'boolean', default: false},
        getEntityName: { type: 'function', default: async (id) => {
          this.debug && console.log(`Faking get entity name for entity ${id}`);
          return `[${Tid.toBase36String(id)}]`
        }},
        getEntityType: { type: 'function', default: async (id) => {
          this.debug && console.log(`Faking get entity type for entity ${id}`);
          return -1
        }},
        saveStatement: { type: 'function', default: async (object, qualifications, editorialNote) => {
          this.debug && console.log(`Faking save statement`, [object, qualifications, editorialNote]);
          await wait(500);
          return { success: false, msg: 'Save statement not implemented yet', statements: []}
        }},
        cancelStatement: { type: 'function', default: async (statementId) => {
          this.debug && console.log(`Faking cancel statement`, statementId);
          await wait(500);
          return { success: false, msg: 'Cancel statement not implemented yet'}}
        }}
    })
    this.options = oc.getCleanOptions(options);
    this.containerSelector = this.options.containerSelector;
    this.def = this.options.predicateDefinition;
    this.id = this.def.id
    this.label = this.options.label;
    this.name = this.def.name;
    this.statements = this.options.statements;
    this.currentStatements = this.getCurrentStatements(this.statements);
    this.currentModes = [];
    this.isRelation = this.def.type === Entity.tRelation;
    this.getEntityName = this.options.getEntityName;
    this.getEntityType = this.options.getEntityType;
    this.saveStatement = this.options.saveStatement;
    this.debug = true;
  }


  /**
   * @private
   */
  getCurrentStatements(statements) {
    return statements
      .filter( (statement) => {
        return statement.predicate === this.id && statement['cancellationId'] === -1;
      });
  }

  async init(mode = null) {
    if (mode === null) {
      mode = this.options.initialMode;
    }
    $(this.containerSelector).html('').html(await this.getHtml());
    let displayedStatements = [ ...this.currentStatements];
    if (this.currentStatements.length === 0) {
      displayedStatements = [ this.getNewStatementSkeletonObject()];
    }
    if (!this.options.predicateDefinition['singleProperty']) {
      displayedStatements.push( this.getNewStatementSkeletonObject());
    }
    this.statementElements = [];
    await Promise.all(displayedStatements.map( async (statement) => {
      this.statementElements[statement.id] = {
        objectElement: $(`${this.containerSelector} .mde-predicate-object-${statement.id}`),
        editElement:  $(`${this.containerSelector} .bpe-predicate-edit-${statement.id}`),
        iconsSpan: $(`${this.containerSelector} .mde-predicate-icons-${statement.id}`),
        editButton: $(`${this.containerSelector} .edit-button-${statement.id}`),
        cancelButton: $(`${this.containerSelector} .cancel-button-${statement.id}`),
        infoButton: $(`${this.containerSelector} .info-button-${statement.id}`)
      }
      let elements = this.statementElements[statement.id];
      elements.objectElement.on('mouseenter', () => {
        elements.iconsSpan.removeClass('ghost');
      });
      elements.objectElement.on('mouseleave', () => {
        elements.iconsSpan.addClass('ghost');
      });

      elements.editButton.on('click', this.genOnClickEditButton(statement));
      elements.infoButton.on('click', this.genOnClickInfoButton(statement));
      elements.infoButton.popover({
        content: await this.getInfoPopoverHtml(statement),
        html: true,
        title: await this.getPredicateName(),
      }).on('mouseenter', () => {
        elements.infoButton.popover('show');
      }).on('mouseleave', () => {
        elements.infoButton.popover('hide');
      });
      elements.cancelButton.on('click', this.genOnClickCancelStatementButton(statement));
      this.currentModes[statement.id] = 'show';
    }));

    if (mode === 'edit') {
      for (let i = 0; i < this.currentStatements.length; i++) {
        await this.switchToEditMode(this.currentStatements[i]);
      }
    }
  }

  /**
   *
   * @param {object}statement
   * @return {Promise<void>}
   */
  async switchToEditMode(statement) {

    if (this.isRelation) {
      // TODO: add object chooser controls
    } else {
      this.statementElements[statement.id].editElement
        .removeClass('hidden bpe-predicate-edit-relation')
        .addClass('bpe-predicate-edit-attribute')
        .html(await this.getEditModeHtmlForAttribute(statement));

      let selectorPrefix = `${this.containerSelector} .bpe-predicate-edit-${statement.id}`;
      this.statementElements[statement.id].attributeValueInput = $(`${selectorPrefix} .value-input`);
      this.statementElements[statement.id].noteInput = $(`${selectorPrefix} .note-input`);
      this.statementElements[statement.id].editSaveButton = $(`${selectorPrefix} .edit-save-button`);
      this.statementElements[statement.id].editCancelButton = $(`${selectorPrefix} .edit-cancel-button`);
      this.statementElements[statement.id].statusDiv = $(`${selectorPrefix} div.status-div`);
      this.statementElements[statement.id].attributeValueInput.val(statement.object);
      this.statementElements[statement.id].attributeValueInput.on('keyup', this.genOnInputChangeAttributeMode(statement));
      this.statementElements[statement.id].noteInput.on('keyup', this.genOnInputChangeAttributeMode(statement));
      this.statementElements[statement.id].editCancelButton.on('click', (ev) => {
        ev.preventDefault();
        this.switchToShowMode(statement);
      });
      this.statementElements[statement.id].editSaveButton.on('click', this.genOnClickEditSaveButton(statement));
      this.statementElements[statement.id].iconsSpan.addClass('hidden');
      this.currentMode = 'edit';
    }
  }

  genOnClickEditSaveButton(statement) {
    return async (ev) => {
      ev.preventDefault();
      let dataFromForm = this.getDataFromForm(statement, true);
      let validationResult = this.validateData(statement, dataFromForm, true);
      if (validationResult !== true) {
        console.log(`Click on save button with invalid data: ${validationResult}`);
        return;
      }
      this.statementElements[statement.id].statusDiv.html(`<span class="text-warning">Saving...</span>`);
      this.statementElements[statement.id].editSaveButton.addClass('disabled');
      let result = await  this.options.saveStatement(dataFromForm.object, [], dataFromForm.editorialNote);
      if (result.success) {
        this.statementElements[statement.id].editSaveButton.addClass('hidden');
        this.statementElements[statement.id].statusDiv.html(`Data saved successfully`);
        await wait(500);
        // TODO: load new statements
        this.switchToShowMode();
      }  else {
        this.statementElements[statement.id].statusDiv.html(`<span class="text-danger">Error saving data:<br/><b>${result.msg}</b>`);
        await wait(1000);
        this.statementElements[statement.id].editSaveButton.removeClass('disabled');
      }

    }
  }

  getDataFromForm(statement, attributeMode) {
    if (attributeMode) {
      return {
        object: trimWhiteSpace(this.statementElements[statement.id].attributeValueInput.val()),
        editorialNote: trimWhiteSpace(this.statementElements[statement.id].noteInput.val())
      }
    } else {
      return {
        object: -1,
        editorialNote: trimWhiteSpace(this.statementElements[statement.id].noteInput.val())
      };
    }
  }

  validateData(statement, data, attributeMode) {
    let currentObject = statement.object;

    if (data.object === currentObject) {
      return `No changes`;
    }
    if (attributeMode && data.object === '') {
      return `Value cannot be empty`;
    }

    if (data.editorialNote.length === 0) {
      return `Editorial note cannot be empty`;
    }
    if (data.editorialNote.length < 5 ) {
      return `Editorial note too short`;
    }
    return true;
  }



  genOnInputChangeAttributeMode(statement) {
    return (ev) => {
      ev.preventDefault();
      let dataFromForm = this.getDataFromForm(statement, true);
      let validationResult = this.validateData(statement, dataFromForm, true);
      if (validationResult !== true) {
        this.statementElements[statement.id].statusDiv.html(`<span class="text-danger">${validationResult}</span>`);
        this.statementElements[statement.id].editSaveButton.addClass('disabled');
      } else {
        this.statementElements[statement.id].statusDiv.html('');
        this.statementElements[statement.id].editSaveButton.removeClass('disabled');
      }
    }
  }

  switchToShowMode(statement) {
    this.statementElements[statement.id].editElement.html('')
      .addClass('hidden')
      .removeClass('bpe-predicate-edit-attribute bpe-predicate-edit-relation');
    this.statementElements[statement.id].iconsSpan.removeClass('hidden');
    this.currentMode = 'show';
  }

  async getEditModeHtmlForAttribute(statement) {
    let inputHtml = this.options.multiLineInput ?
      `<textarea class="value-input" placeholder="Enter value here" rows="3"></textarea>` :
      `<input type="text" class="value-input">`;
    return `<!-- Statement ${statement.id} Edit (Attribute) --><div>${this.getPredicateName()}</div><div>${inputHtml}</div>
        <div>Note</div><div><textarea class="note-input" placeholder="Enter an editorial note here" cols="20" rows="3"></textarea></div>
       <div></div> <div class="status-div"></div> 
        <div></div><div><a class="btn btn-sm btn-secondary edit-save-button disabled">Save</a>
        <a class="btn btn-sm btn-secondary edit-cancel-button">Cancel</a></div>`
  }


  genOnClickEditButton(statement) {
    return (ev) => {
      ev.preventDefault();
      if (this.currentMode === 'edit') {
        console.warn("Already in edit mode!");
        return;
      }
      this.switchToEditMode(statement).then(() => {});
    }
  }

  genOnClickInfoButton(statement) {
    return (ev) => {
      ev.preventDefault();
      this.debug && console.log(`Click on predicate ${this.id} INFO button`);
      this.statementElements[statement.id].infoButton.popover('hide');
    }
  }

  genOnClickCancelStatementButton(statement) {
    return async (ev) => {
      ev.preventDefault();
      let dialog = new GetDataAndProcessDialog({
        title: "Do you want to cancel this data statement?",
        processButtonLabel: 'Yes, do it',
        cancelButtonLabel: "Close this dialog without doing anything",
        validateData: (data) => {
          return trimWhiteSpace(data).length < 4 ? `<span class="text-warning">Too few characters, enter 5 or more</span>` : true;
        },
        getDataFromForm: (dialogSelector) => {
          return $(`${dialogSelector} .cancel-note-input`).val();
        },
        processData: async (data, infoArea) => {
          console.log(`Cancellation Note`, data);
          infoArea.html("Cancelling statement");
          let result = await this.options.cancelStatement(statement.id, data);
          if (result.success) {
            // TODO: reset data with new statements
            return result;
          } else {
            infoArea.html(`<span class="text-danger">Error cancelling data statement: ${result.msg}`);
            return result;
          }
        },
        getBodyHtml: async () => {
          let statementInfo = `${await this.getStatementCard(statement)}`

          return `<div class="bpe-cancellation-confirm-statement">${statementInfo}</div>
            <p>Cancellation Note:</br>
            <textarea class="cancel-note-input" placeholder="Enter a reason for this cancellation" cols="40" rows="3"></textarea>
            </p>`
        },
        hideOnAccept: false,
      });
      await dialog.process();
    }
  }

  getEditButtonHtml(statement, addNew = false) {
    let icon = addNew ? 'Add New' : '<i class="bi bi-pencil"></i>';
    let title = addNew ? 'Click to add new statement' : 'Click to edit';

    let classes = [ 'edit-button', `edit-button-${statement.id}`];
    if (addNew) {
      classes.push(...['btn', 'btn-sm', 'btn-secondary']);
    }
    return `<a href="#" class="${classes.join(' ')}" title="${title}">${icon}</a>`
  }

  getCancellationButtonHtml(statement) {
    return `<a href="" class="cancel-button cancel-button-${statement.id}" title="Click to cancel this statement"><i class="bi bi-trash"></i></a>`;
  }

  getInfoButtonHtml(statement) {
    return `<a href="" class="info-button info-button-${statement.id}" ><i class="bi bi-info-circle"></i></a>`;
  }

  getNewStatementSkeletonObject() {
    return {
      id: `pred-${this.id}-new`,
      object: this.isRelation ? -1 : ''
    }
  }

  getStatementDivsForNewStatement(addNew = false) {
    let allowedQualifications = this.options.predicateDefinition.allowedQualifications ?? [];
    let statement = this.getNewStatementSkeletonObject();
    let editButton = !this.options.readOnly ? this.getEditButtonHtml(statement, addNew) : '';
    let infoButton = !addNew ? this.getInfoButtonHtml(statement) : '';
    let objectTitle = addNew ? '' : 'No data';
    let ghostClass = 'ghost';
    return allowedQualifications.map( () => { return '<div></div>'}).join('') +
      `<div>
            <div class="mde-predicate-object mde-predicate-object-${statement.id}"><i>${objectTitle}</i> 
                <span class="mde-predicate-icons mde-predicate-icons-${statement.id} ${ghostClass}">${editButton} ${infoButton}</span>
            </div>
            <div class="bpe-predicate-edit bpe-predicate-edit-${statement.id} hidden"></div>
        </div>`;
  }

  /**
   * @return {Promise<string>}
   * @private
   */
  async getHtml() {
    let allowedQualifications = this.options.predicateDefinition.allowedQualifications ?? [];
    let newStatementDivsPre = '';
    if (this.currentStatements.length === 0) {
      newStatementDivsPre = this.getStatementDivsForNewStatement();
    }
    let statementDivs = (await Promise.all(this.currentStatements.map( async (statement) => {
      let editButton = !this.options.readOnly ? this.getEditButtonHtml(statement) : '';
      let cancellationButton = this.currentStatements.length !== 0 && !this.options.readOnly && this.def.canBeCancelled ?
         this.getCancellationButtonHtml(statement) : '';
      let infoButton = this.getInfoButtonHtml(statement);
      let iconsSpan = `<span class="mde-predicate-icons mde-predicate-icons-${statement.id} ghost">${editButton} ${cancellationButton} ${infoButton}</span>`
      let qualificationDivs = (await Promise.all(allowedQualifications.map(
        async (qualificationPredicate) => {
          let qualificationObject = null;
          for(let i = 0; i < statement.statementMetadata.length; i++) {
            if (statement.statementMetadata[i][0] === qualificationPredicate) {
              qualificationObject = statement.statementMetadata[i][1];
              break;
            }
          }
          let objectText = qualificationObject === null ? '' :
            typeof qualificationObject === 'string' ? qualificationObject : await this.options.getEntityName(qualificationObject);
          return `<div class="bpe-qualification bpe-qualification-${qualificationPredicate}">${objectText}</div>`;
      }))).join('');
      return `${qualificationDivs}
        <div>
            <div class="mde-predicate-object mde-predicate-object-${statement.id}">${await this.getObjectHtml(statement)} ${iconsSpan}</div>
             <div class="bpe-predicate-edit bpe-predicate-edit-${statement.id} hidden"></div>
        </div>`
    }))).join('');
    let newStatementDivsPost = '';
    if (this.currentStatements.length !== 0 && !this.options.predicateDefinition['singleProperty']) {
      newStatementDivsPost = this.getStatementDivsForNewStatement(true);
    }
    let gridTemplateColumns = [ ...this.options.predicateDefinition.allowedQualifications ?? [], -1].map ( (q) => {
      return q === -1 ? 'auto' : 'max-content';
    }).join(' ');
    let style = `display:grid; grid-template-columns: ${gridTemplateColumns};`;
    return `<div class="mde-predicate-label">${this.getLabelHtml()}</div>
        <div class="mde-statement-divs" style="${style}">
            ${newStatementDivsPre}
            ${statementDivs}
            ${newStatementDivsPost}
        </div>`;
  }

  /**
   * @return {Promise<string>}
   * @private
   */
  async getObjectHtml(statement) {
    if (statement === null) {
      return `<i>No data</i>`;
    }
    let objectUrl = await this.options.getObjectUrl(statement.object);
    if (this.isRelation) {
      let objectType = await this.getEntityType(statement.object);
      let objectName = await this.getEntityName(statement.object);
      if (objectType === -1) {
        return objectName;
      }
      return objectUrl === null ? objectName :
        `<a href="${objectUrl}" title="Click to open ${objectName}'s page">${objectName}</a>`
    }
    return objectUrl === null ? statement.object :
      `<a href="${objectUrl}" target="_blank" title="Click to visit ${this.getPredicateName()} page">
        ${statement.object}</a>`;
  }


  getPredicateName() {
    return this.label === '' ? this.name : this.label;
  }
  /**
   * @private
   */
  getLabelHtml() {
    if (!this.options.showLabel) {
      return '';
    }
    let name = this.getPredicateName();
    let label = `<b>${name}</b>:`;
    return this.options.logoUrl !== '' ? `<img src="${this.options.logoUrl}" class="mde-predicate-logo" alt="${name}" title="${name}">` : label;
  }

  async getInfoPopoverHtml(statement) {
    if (statement.id === this.getNewStatementSkeletonObject().id) {
      if (this.currentStatements.length === 0) {
        // never been set
        return `<div><i>Never been edited</i></div>`
      }
      if (this.currentStatements.length <= this.statements.length) {
        // previous edits
        return `
           <div><i>No active data</i></div>
           <div class="bpe-popover-more-info-line">Cancelled statements available. Click info icon to see full list</div>`
      }
      console.warn(`Inconsistent number of statements for new statement: current ${this.currentStatements.length}, all ${this.statements.length}`,
        this.currentStatements, this.statements);
      return `<div><i>Inconsistent data</i></div>`;
    }

    let html = await this.getStatementCard(statement, [ 'bpe-statement-popover']);
    if (this.currentStatements.length < this.statements.length) {
      html += `<div class="bpe-popover-more-info-line">There are cancelled statements. Click info icon to see full list</div>`
    }
    return html;
  }

  async getStatementCard(statement, extraClasses = [], includeParts = [ true, true, true]) {
    if (statement.id === this.getNewStatementSkeletonObject().id) {
      return '';
    }
    let [ includeSubject, includePredicate, includeObject ] = includeParts;
    let author= Statement.getAuthor(statement);
    let authorName = await this.getEntityName(author);
    let editorialNote = Statement.getEditorialNote(statement) ?? '<i>No editorial note left</i>';
    let time = ApmFormats.time(Statement.getEditTimestamp(statement));
    let subjectArea = '';
    let predicateArea = '';
    let objectArea = '';

    if (includeSubject) {
      subjectArea = `<div>${SubjectIcon}</div><div>${Tid.toBase36String(statement.subject)} (${await this.getEntityName(statement.subject)})</div>`
    }

    if (includePredicate) {
      predicateArea = `<div>${PredicateIcon}</div><div>${statement.predicate} (${await this.getEntityName(statement.predicate)})</div>`
    }

    if (includeObject) {
      let objectString= this.isRelation ?
        `${Tid.toBase36String(statement.object)} (${await this.getEntityName(statement.object)})` :
        `<span class="text-monospace">${statement.object}</span>`;
      objectArea = `<div>${this.isRelation ? ObjectIcon : ValueIcon}</div><div>${objectString}</div>`;
    }

    let qualificationDivs = (await Promise.all(statement.statementMetadata.map( async (statementMetadataItem) => {
      let [ metadataPredicate, object] = statementMetadataItem;
      if ([Entity.pStatementAuthor, Entity.pStatementTimestamp, Entity.pStatementEditorialNote].indexOf(metadataPredicate) !== -1) {
        return '';
      }
      let metadataPredicateName = await this.options.getEntityName(metadataPredicate);
      let objectText = typeof object === 'string' ? object : await this.options.getEntityName(object);
      return `<div>${metadataPredicateName}</div><div>${objectText}</div>`;
    }))).join('');


    return `<div class="mde-statement-card ${extraClasses.join(' ')}">
        ${subjectArea} ${predicateArea} ${objectArea}
        ${qualificationDivs}
        <div><i class="bi bi-chat"></i></div>
        <div>${editorialNote}</div>
        <div><i class="bi bi-person-badge"></i></div>
        <div>${authorName}</div>
        <div><i class="bi bi-clock"></i></div>
        <div>${time}</div>
        <div><i class="bi bi-file-spreadsheet"></i></div>
        <div>${statement.id}</div>
       </div>`
  }

}