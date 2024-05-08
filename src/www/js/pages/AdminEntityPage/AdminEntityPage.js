import { NormalPage } from '../NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../../Tid/Tid'
import { capitalizeFirstLetter } from '../../toolbox/Util.mjs'
import { urlGen } from '../common/SiteUrlGen'
import { ApmFormats } from '../common/ApmFormats'


const TimestampPredicates = [ 2004, 3002, 5002];
const UrlPredicates = [ 2009];

export class AdminEntityPage extends NormalPage {

  constructor (options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'AdminEntityPage',
      optionsDefinition: {
        entityData: { type: 'Object', required: true},
        predicatesAllowedAsSubject: { type: 'Object', required: true },
        predicatesAllowedAsObject: { type: 'Object', required: true },
        predicateDefs: { type: 'Object', required: true}
      }
    })

    this.options = oc.getCleanOptions(options);
    console.log('Options', this.options);


    this.data = this.options.entityData;
    this.predicateDefs = this.options.predicateDefs;

    this.entityId = this.data['id'];
    this.title = `Ent. ${this.entityId}`;
    this.initPage().then( () => {});
  }

  async initPage () {
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
     let predicateArray = asSubject ? this.options.predicatesAllowedAsSubject : this.options.predicatesAllowedAsObject;

     return predicateArray.filter( (predicate) => {
       let def = this.predicateDefs[predicate];
       if (def['flags'].length > 0) {
         return false;
       }
       let isUsed = this.data.statements.filter( (statement) => {
         return statement['predicate'] === predicate;
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
      html += `<tr>
        <td>${await this.getEntityHtml(predicates[i])}</td>
        <td><a class="btn btn-primary btn-sm new-statement-btn ${asSubject ? 'as-subject' : 'as-object'} predicate-${predicates[i]}"
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
    return `<h1>Entity ${this.entityId} <small> = ${Tid.toBase36String(this.entityId)}</small></h1>
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

  async getEntityName(id) {
    if (id === this.entityId) {
      return '';
    }
    if (this.predicateDefs[id] !== undefined) {
      return this.predicateDefs[id]['name'];
    }
    let data;
    try {
      data = await this.apmDataProxy.getEntityData(id);
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