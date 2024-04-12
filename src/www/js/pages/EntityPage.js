import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../Tid/Tid'
import { capitalizeFirstLetter } from '../toolbox/Util.mjs'
import { urlGen } from './common/SiteUrlGen'
import { ApmFormats } from './common/ApmFormats'


const TimestampPredicates = [ 2004, 3002, 5002];
const UrlPredicates = [ 2009];

export class EntityPage extends NormalPage {

  constructor (options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'EntityPage',
      optionsDefinition: {
        entityData: { type: 'Object', required: true},
      }
    })

    let cleanOptions = oc.getCleanOptions(options);

    this.data = cleanOptions.entityData;
    this.tid = this.data['id'];
    this.title = `Ent. ${this.tid}`;
    this.initPage().then( () => {});
  }

  async initPage () {
    await super.initPage();
    document.title = this.title;
  }

  async genContentHtml () {
    return `<h1>Entity ${this.tid} <small> = ${Tid.toBase36String(this.tid)}</small></h1>
        <h2>Data</h2>
        ${await this.getSimpleElementsHtml(this.data)}
        <h3>Statements</h3>
        ${await this.getStatementsTable(this.data['statements'])}
        <h3>Statements as Object</h3>
        ${await this.getStatementsTable(this.data['statementsAsObject'])}
        <div class="entity-data-dump">
            <h2>Json</h2>
            <pre>${JSON.stringify(this.data, null, 3)}</pre>
        </div>`;
  }

  async getEntityName(tid) {
    if (tid === this.tid) {
      return '';
    }
    let data;
    try {
      data = await this.apmDataProxy.getEntityData(tid);
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
    return `<a href="${urlGen.siteEntity(tid)}" title="Entity ${tid} = ${Tid.toBase36String(tid)}">${tid}  [${name}]</a>`
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


  async getStatementsTable(statements) {
    if (statements.length === 0) {
      return `<em>None</em>`;
    }
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

      cols.push(qualificationItems.join('<br/>'))
      cols.push(metadataItems.join('<br/>'))
      if (cancellationItems.length === 0) {
        cols.push('<span class="active-notice">Active</span>');
      } else {
        cols.push(cancellationItems.join('<br/>'))
      }

      rows.push(cols);
    }

    let html = '';
    html += '<table class="statements">';
    html += '<tr><th>Statement Id</th><th>Subject</th><th>Predicate</th><th>Object</th><th>Qualifications</th><th>Statement Metadata</th></tr>'

    html += rows.map( (row) => {
      let rowHtml = '<tr>';
      rowHtml += row.map( (col) => { return `<td>${col}</td>`}).join('');
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


window.EntityPage = EntityPage;