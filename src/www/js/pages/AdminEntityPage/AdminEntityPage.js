import { NormalPage } from '../NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../../Tid/Tid'
import { capitalizeFirstLetter } from '../../toolbox/Util.mjs'
import { urlGen } from '../common/SiteUrlGen'
import { ApmFormats } from '../common/ApmFormats'
import { GenericStatementEditor } from './GenericStatementEditor'
import { ConfirmDialog } from '../common/ConfirmDialog'


const TimestampPredicates = [ 2004, 3002, 5002];
const UrlPredicates = [ 2009];

export class AdminEntityPage extends NormalPage {

  constructor (options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'AdminEntityPage',
      optionsDefinition: {
        entityData: { type: 'Object', required: true},
      }
    })

    this.options = oc.getCleanOptions(options);
    console.log('Options', this.options);
    this.data = this.options.entityData;
    this.statements = this.data.statements;
    this.entityId = this.data['id'];
    this.title = `Ent. ${this.entityId}`;
    this.initPage().then( () => {
      $(`.new-statement-btn`).on('click', this.genOnClickNewStatementButton());
      $('.cancel-statement-btn').on('click', this.genOnClickCancelStatementButton());
      $('.edit-statement-btn').on('click', this.genOnClickEditStatementButton());
    })
  }

  genOnClickCancelStatementButton() {
    return (ev) => {
      ev.preventDefault();
      let statementId = this.getIdFromClassNameString(ev.target.className, 'statement');
      if (statementId === null || statementId < 0) {
        console.log(`Invalid statement id in classes ${ev.target.className}`);
        return;
      }

      this.getCancelDialogHtml(statementId).then( (dialogHtml) => {
        this.cancelDialog = new ConfirmDialog({
          acceptButtonLabel: 'Yes, do it',
          cancelButtonLabel: 'No',
          title: "Cancel statement",
          body: dialogHtml,
          hideOnAccept: false,
        })
        this.cancelDialogInfo = `${this.cancelDialog.getSelector()} .cancel-dialog-info}`;
        this.cancellationNoteInput = $(`${this.cancelDialog.getSelector()} .cancellation-note-input`);
        this.cancelDialog.setAcceptFunction(() => {
          let cancellationNote = this.cancellationNoteInput.val().trim();
          console.log(`Cancelling statement id: ${statementId}, note: '${cancellationNote}'`);
          this.cancelDialog.cancelButton .prop('disabled', true);
          this.cancelDialog.acceptButton.prop('disabled', true);
          this.cancelDialog.setAcceptButtonLabel("Cancelling statement...");

          let commands = [{ command: 'cancel', statementId: statementId , editorialNote: cancellationNote}];
          $.post(urlGen.apiEntityStatementsEdit(), JSON.stringify(commands)).then( (response) => {
            console.log("Success", response);
            if (response.success === true) {
              this.cancelDialog.hide();
              window.location.reload();
            } else {
              this.cancelDialogInfo.html("Errors cancelling statement:<br/>&nbsp;&nbsp;" +
                response['commandResults'].map( (r) => { return `[${r.errorCode}] ${r.errorMessage}`})
                  .join("<br/>&nbsp;&nbsp;"));
              this.cancelDialog.setAcceptButtonLabel("Yes, try to cancel again");
              this.cancelDialog.cancelButton .prop('disabled', false);
              this.cancelDialog.acceptButton.prop('disabled', false);
            }
          }).catch( (response) => {
            console.error("Failure", response);
            this.cancelDialogInfo.html("Error cancelling statement, check console.");
            this.cancelDialog.setAcceptButtonLabel("Yes, try to cancel again");
            this.cancelDialog.cancelButton .prop('disabled', false);
            this.cancelDialog.acceptButton.prop('disabled', false);
          })
        });
        this.cancelDialog.show();
      })
    }
  }

  async getCancelDialogHtml(statementId) {

    let filteredStatements = this.statements.filter( (statement) => statement.id === statementId);
    if (filteredStatements.length === 0) {
      return `ERROR: statement ${statementId }not found`;
    }

    let statement = filteredStatements[0];
    let objectHtml = typeof statement.object === 'number'
      ? `${statement.object} [${await this.getEntityName(statement.id, false)}]`
      : `'${statement.object}'`;


    return `<p>Do you want to cancel statement ${statementId}?</p>
     <p><b>Subject</b>: ${statement.subject} [${await this.getEntityName(statement.subject, false)}]<br/>
     <b>Predicate</b>: ${statement.predicate} [${await this.getEntityName(statement.predicate)}]<br/>
     <b>Object</b>: ${objectHtml}</p>
     <p><b>Cancellation Note</b>: <textarea class="cancellation-note-input"></textarea></p>
     <div class="cancel-dialog-info"></div>`
  }

  genOnClickEditStatementButton() {
    return (ev) => {
      ev.preventDefault();
      console.log('Click on edit statement button')
      let statementId = this.getIdFromClassNameString(ev.target.className, 'statement');
      if (statementId === null || statementId < 0) {
        console.log(`Invalid statement id in classes ${ev.target.className}`);
        return;
      }
      console.log(`Statement id: ${statementId}`);

      let statement = this.statements.filter((statement) => statement.id === statementId)[0];
      if (statement === undefined) {
        console.warn(`Undefined statement ${statementId}`);
        return;
      }
      new GenericStatementEditor({
        statementId: statementId,
        editableParts : [ false, false, true],
        subject: this.entityId,
        predicate: statement.predicate,
        object: statement.object,
        relation: typeof statement.object === 'number',
        statementMetadata: statement.statementMetadata,
        predicateDef: this.predicateDefs[statement.predicate],
        qualificationDefs: this.qualificationDefs,
        onSuccess: this.genOnStatementEditorSuccess(),
        getEntityName: this.genGetEntityName(),
        getEntityList: this.genGetEntitiesForType(),
      })

    }
  }

  genGetEntityName() {
    return (id) => {
      return this.getEntityName(id, false);
    }
  }

  genGetEntitiesForType() {
    return (type) => {
      return this.apmDataProxy.getEntityListForType(type);
    }
  }

  getIdFromClassNameString(classNameString, prefix) {
    let classes = classNameString.split(' ');
    for (let i = 0; i < classes.length; i++) {
      let [name, value] = classes[i].split('-');
      if (name === prefix) {
        return parseInt(value);
      }
    }
    return null;
  }

  genOnClickNewStatementButton() {
    return (ev) => {
      ev.preventDefault();
      console.log('Click on new statement button')

      let classes = ev.target.className.split(' ');
      let asSubject = classes.indexOf('as-subject') !== -1;
      let relation = classes.indexOf('is-relation') !== -1;
      let predicate = this.getIdFromClassNameString(ev.target.className, 'predicate');
      if (predicate === null) {
        console.log("No predicate defined");
        return;
      }
      if (asSubject) {
        console.log(`New statement as subject, predicate ${predicate}`);
        new GenericStatementEditor({
          editableParts : [ false, false, true],
          subject: this.entityId,
          predicate: predicate,
          relation: relation,
          allowedQualifications: this.predicateDefs[predicate].allowedQualifications,
          statementMetadata: [],
          predicateDef: this.predicateDefs[predicate],
          qualificationDefs: this.qualificationDefs,
          getEntityName: this.genGetEntityName(),
          getEntityList: this.genGetEntitiesForType(),
          onSuccess: this.genOnStatementEditorSuccess(),
        })

      } else {
        console.log(`New statement as object, predicate ${predicate}`);
        console.log(`Not implemented yet`);
      }

    }
  }

  genOnStatementEditorSuccess() {
    return () => {
      window.location.reload();
    }
  }

  async initPage () {
    let typeData = await this.apmDataProxy.getPredicateDefinitionsForType(this.data.type);
    console.log('Entity Type Data', typeData);
    this.predicateDefs = typeData['predicateDefinitions'];
    this.predicatesAllowedAsObject = typeData['predicatesAllowedAsObject'];
    this.predicatesAllowedAsSubject = typeData['predicatesAllowedAsSubject'];
    this.qualificationDefs = typeData['qualificationDefinitions'];

    await super.initPage();
    document.title = this.title;
  }

  /**
   * Return an array of predicates that the used as new statements for the entity
   * either because they allowed and are not yet used in any statement or
   * because the predicate allows multiple statements for the same entity
   *
   * @param asSubject
   * @return {int[]}
   */
  getPredicatesAvailableForAdding(asSubject = true) {
     let predicateArray = asSubject ? this.predicatesAllowedAsSubject : this.predicatesAllowedAsObject;

     return predicateArray.filter( (predicate) => {
       let def = this.predicateDefs[predicate];
       if (def['flags'].length > 0) {
         return false;
       }
       let isUsed = this.data.statements.filter( (statement) => {
         return statement['predicate'] === predicate && statement['cancellationId'] === -1;
       }).length > 0;
       return !(asSubject && def['singleProperty'] && isUsed);
     })

  }

  /**
   *
   * @param {int[]}predicates
   * @param {boolean}asSubject
   */
  async getPredicatesAvailableSection(predicates, asSubject) {
    let html = '';
    html += `<div class="available-predicates">`;
    html += '<h4>Predicates Available</h4>'
    html += '<table class="available-predicates">';
    for(let i = 0; i < predicates.length; i++) {
      let def = this.predicateDefs[predicates[i]];
      let typeClass = def.type === 101 ? 'is-relation' : 'is-attribute';
      html += `<tr>
        <td>${await this.getEntityHtml(predicates[i])}</td>
        <td><a class="btn btn-outline-secondary btn-sm new-statement-btn ${asSubject ? 'as-subject' : 'as-object'} predicate-${predicates[i]} ${typeClass}"
        title="Click to create a new statement with the entity as ${asSubject ? 'subject' : 'object'}">
        New Statement</a></td>
        </tr>`;
    }
    html += '</table>';
    html += '</div>'
    return html;
  }

  async genContentHtml () {
    let availablePredicatesAsSubject = this.getPredicatesAvailableForAdding(true);
    let availablePredicatesAsObject = this.getPredicatesAvailableForAdding(false);
    let apmUrl = urlGen.siteEntityPage(this.data.type, this.entityId);
    let apmUrlLink = apmUrl === '' ? '<i>None</i>' : `<a href="${apmUrl}">${apmUrl}</a>`;
    return `<h1>Entity ${this.entityId} <small> = ${Tid.toBase36String(this.entityId)}</small></h1>
         <p>Apm Url:  ${apmUrlLink} </p>
        <h2>Basic Data</h2>
        ${await this.getSimpleElementsHtml(this.data)}
        <h3>Statements as Subject</h3>
        ${await this.getStatementsTable(this.data['statements'])}
        ${availablePredicatesAsSubject.length > 0 ? await this.getPredicatesAvailableSection(availablePredicatesAsSubject, true) : ''}
        <h3>Statements as Object</h3>
        ${await this.getStatementsTable(this.data['statementsAsObject'])}
        ${availablePredicatesAsSubject.length > 0 ? await this.getPredicatesAvailableSection(availablePredicatesAsObject, false) : ''}
        <div class="entity-data-dump">
            <h2>Json</h2>
            <pre>${JSON.stringify(this.data, null, 3)}</pre>
        </div>`;
  }

  async getEntityName(id, suppressOwnEntity = true) {
    if (isNaN(id)) {
      console.warn("Request for entity name for non-numerical id", id);
      return '';
    }
    if (id === this.entityId) {
      return suppressOwnEntity ? '' : this.data.name;
    }
    if (this.predicateDefs[id] !== undefined) {
      return this.predicateDefs[id]['name'];
    }
    let data;
    try {
      data = await this.apmDataProxy.getEntityData(id, 15 * 60);
    } catch (e) {
      return '';
    }
    return data['name'];
  }

  async getEntityHtml(tid) {
    let name = await this.getEntityName(tid);
    if (name === '') {
      return tid;
    }
    return `<a href="${urlGen.siteAdminEntity(tid)}" title="Entity ${tid} = ${Tid.toBase36String(tid)}">${tid}  [${name}]</a>`
  }

  /**
   *
   * @param {Object}someObject
   * @param {string[]}propertyClasses
   * @return {Promise<string>}
   */
  async getSimpleElementsHtml(someObject, propertyClasses = [ 'property' ]) {
    let items = [];
    let keys = Object.keys(someObject);
    for(let i=0; i < keys.length; i++) {
      let key = keys[i];
      let actualValue = someObject[key];
      let valueHtml = '';
      switch (typeof actualValue) {
        case 'string':
          valueHtml = `'${actualValue}'`;
          break;

        case 'number':
          valueHtml = await this.getEntityHtml(actualValue);
          break;

        case 'object':
          if (actualValue === null) {
            valueHtml = 'null';
          }
          break;

        default:
          if (actualValue === null) {
            valueHtml = 'null';
          } else {
            valueHtml = typeof actualValue;
          }
      }

      if (valueHtml !== '') {
        items.push(`<p class="${propertyClasses.join(' ')}"><b>${capitalizeFirstLetter(key)}</b>: ${valueHtml}</p>`);
      }
    }

    return items.join('');
  }

  getObjectValueTypeFromPredicate(predicate) {
    if (TimestampPredicates.indexOf(predicate) !== -1) {
      return 'timestamp';
    }
    if (UrlPredicates.indexOf(predicate) !== -1) {
      return 'url';
    }
    return 'literal';
  }

  /**
   *
   * @param {[]}statements
   * @param {string}orderBy
   * @return {Promise<string>}
   */
  async getStatementsTable(statements, orderBy = 'predicate') {
    if (statements.length === 0) {
      return `<em>None</em>`;
    }

    statements.sort( (a, b) => {
      return parseInt(a[orderBy]) - parseInt(b[orderBy])
    })

    const metadataPredicates = [ 3001, 3002, 3003];
    let rows = [];
    for (let i = 0; i < statements.length; i++) {
      let statement = statements[i];
      let cols = [];
      cols.push(statement['id']);

      cols.push(await this.getEntityHtml(statement['subject']));
      cols.push(await this.getEntityHtml(statement['predicate']));
      cols.push(await this.getObjectHtml(statement['object'], this.getObjectValueTypeFromPredicate(statement['predicate'])));

      let metadataItems = [];
      let qualificationItems = [];
      let cancellationItems = [];
      for (let metadataIndex = 0; metadataIndex < statement['statementMetadata'].length; metadataIndex++) {
        let [ predicate, obj] = statement['statementMetadata'][metadataIndex];
        if (metadataPredicates.indexOf(predicate) !== -1) {
          metadataItems.push(`${await this.getEntityHtml(predicate)}: ${await this.getObjectHtml(obj, this.getObjectValueTypeFromPredicate(predicate))}`);
        } else {
          qualificationItems.push(`${await this.getEntityHtml(predicate)}: ${await this.getObjectHtml(obj, this.getObjectValueTypeFromPredicate(predicate))}`);
        }
      }

      for (let metadataIndex = 0; metadataIndex < statement['cancellationMetadata'].length; metadataIndex++) {
        let [ predicate, obj] = statement['cancellationMetadata'][metadataIndex];
        cancellationItems.push(`${await this.getEntityHtml(predicate)}: ${await this.getObjectHtml(obj, this.getObjectValueTypeFromPredicate(predicate))}`);
      }

      cols.push(qualificationItems.join('<br/>'));
      cols.push(metadataItems.join('<br/>'));
      if (cancellationItems.length === 0) {
        let spans = [];
        spans.push('<span class="active-notice">Active</span>');
        let predicateDef = this.predicateDefs[statement['predicate']];
        if (predicateDef['flags'].indexOf(5) !== -1) {
          spans.push('<span class="not-editable-notice">System data, editing is disabled</span>');
        } else {
          if (predicateDef['canBeCancelled'] === false) {
            spans.push('<span class="not-cancellable-notice">Cannot be cancelled</span>');
            spans.push(`<span class="edit-buttons-span"><a class="btn btn-outline-secondary btn-sm edit-statement-btn statement-${statement['id']}">Edit</a></span>`);
          } else {
            spans.push(`<span class="edit-buttons-span">
                <a class="btn btn-outline-secondary btn-sm cancel-statement-btn statement-${statement['id']}">Cancel</a>
                <a class="btn btn-outline-secondary btn-sm edit-statement-btn statement-${statement['id']}">Edit</a>
                </span>`);
          }
        }

        cols.push(spans.join('<br/>'));
      } else {
        cols.push(cancellationItems.join('<br/>'));
      }

      rows.push({
        statement: statement,
        cols: cols
      });
    }

    let html = '';
    html += '<table class="statements">';
    html += '<tr><th>Statement Id</th><th>Subject</th><th>Predicate</th><th>Object</th><th>Qualifications</th><th>Statement Metadata</th></tr>'

    html += rows.map( (row) => {

      let tdClasses = [];
      let trClasses = [];
      if (row['statement']['cancellationId'] !== -1) {
        tdClasses.push('cancelled')
        trClasses.push('cancelled');
      }
      let rowHtml = `<tr class="${trClasses.join(' ')}">`;
      rowHtml += row.cols.map( (col) => { return `<td class="${tdClasses.join(' ')}">${col}</td>`}).join('');
      rowHtml += '</tr>';
      return rowHtml;
    }).join('');

    html += '</table>'
    return html;
  }

  async getObjectHtml(object, valueType = 'string') {
    if (typeof object === 'string') {
      switch(valueType) {
        case 'timestamp':
          return `<span class="timestamp-value" title="TS: ${object}">${ApmFormats.time(parseInt(object))}</span>`;

        case 'url':
          return `<a href="${object}" class="url-value" target="_blank"><i class="bi bi-link-45deg"></i> ${object}</a>`;

        default:
          return `<span class="literal-value">${object}</span>`;
      }

    } else {
      return await this.getEntityHtml(object);
    }
  }
}


window.AdminEntityPage = AdminEntityPage;