import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../Tid/Tid'
import { urlGen } from '../pages/common/SiteUrlGen'

export class BasicPredicateEditor {

  constructor (options) {
    const oc = new OptionsChecker({
      context: 'BasicPredicateEditor',
      optionsDefinition: {
        id: { type: 'number', required: true},
        containerSelector: { type: 'string', required: true},
        statements: { type: 'Array', required: true},
        label: { type: 'string', default: ''},
        showLogo: { type: 'boolean', default: false},
        showUrl: { type: 'boolean', default: false},
        isRelation: { type: 'boolean', required: true},
        getEntityName: { type: 'function', default: async (id) => { return `[${Tid.toBase36String(id)}`} },
        getEntityType: { type: 'function', default: async (id) => { return -1}},
        validObjectTypes: { type: 'Array', default: []}
      }
    })
    this.options = oc.getCleanOptions(options);
    this.id = this.options.id;
    let activeStatements = this.options.statements
      .filter( (statement) => {
        return statement.predicate === this.id && statement['cancellationId'] === -1;
      });
    this.currentStatement = activeStatements.length === 0 ? null : activeStatements[0];
  }

  async init() {
    $(this.options.containerSelector).html(await this.getHtml());
    this.objectElement = $(`${this.options.containerSelector} .mde-predicate-object`);
    this.iconsSpan = $(`${this.options.containerSelector} .mde-predicate-icons`);
    this.objectElement.on('mouseenter', () => {
      this.iconsSpan.removeClass('ghost');
    });
    this.objectElement.on('mouseleave', () => {
      this.iconsSpan.addClass('ghost');
    });
  }
  /**
   * @return {Promise<string>}
   * @private
   */
  async getHtml() {
    return `<div class="mde-predicate-label">${await this.getLabelHtml()}</div><div class="mde-predicate-object">${await this.getObjectHtml()}

    <span class="mde-predicate-icons ghost">[e] [i]</span> 

</div>`;
  }

  /**
   * @return {Promise<string>}
   * @private
   */
  async getObjectHtml() {
    if (this.currentStatement === null) {
      return `<i>Not set</i>`;
    }
    if (this.options.isRelation) {
      let objectType = await this.options.getEntityType(this.currentStatement.object);
      let objectName = await this.options.getEntityName(this.currentStatement.object);
      if (objectType === -1) {
        return objectName;
      }
      return `<a href="${urlGen.siteEntityPage(objectType, this.currentStatement.object)}">${objectName}</a>`
    }
    if (this.options.showUrl) {
      return `<a href="${urlGen.entityExternalUrl(this.options.id, this.currentStatement.object)}" 
            target="_blank" title="Click to visit ${await this.getPredicateName()} page">${this.currentStatement.object}</a>`
    }

    return this.currentStatement.object;
  }


  async getPredicateName() {
    return this.options.label === '' ? await this.options.getEntityName(this.id) : this.options.label;
  }
  /**
   * @private
   */
  async getLabelHtml() {
    let name = await this.getPredicateName();
    let label = `<b>${name}</b>:`;
    return this.options.showLogo ? `<img src="${urlGen.entityLogoUrl(this.options.id)}" class="mde-predicate-logo" alt="${name}" title="${name}">` : label;
  }



}