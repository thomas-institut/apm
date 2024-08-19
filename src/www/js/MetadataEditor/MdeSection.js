import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ApmDataProxy } from '../pages/common/ApmDataProxy'

/**
 * A section in the metadata editor
 */
export class MdeSection {

  constructor (options) {
    const oc = new OptionsChecker({
      context: "MdeSection",
      optionsDefinition: {
        containerSelector: { type:'string', required: true},
        entityData: {type: 'object', required: false, default: {}},
        predicateDefinitions: { type: 'object', required: true},
        qualificationDefinitions: { type: 'object', required: true},
        apmDataProxy: { type: 'object', objectClass: ApmDataProxy, required: true},
        sectionSchema: { type: 'object', required: true}
      }
    })
    this.options = oc.getCleanOptions(options);
    this.entityData = this.options.entityData;
    this.schema = this.options.sectionSchema;
    this.title = this.schema.title ?? '';
    this.containerSelector = this.options.containerSelector;
    this.apmDataProxy = this.options.apmDataProxy;
    this.predicateDefinitions = this.options.predicateDefinitions;
    this.qualificationDefinitions = this.options.qualificationDefinitions;
  }

  async init() {
    $(this.containerSelector).html(await this.getBootStrapHtml());
    this.bodyElement = $(`${this.containerSelector} .mde-section-body`);
  }

  async getBootStrapHtml() {
    let title = this.title !== '' ? `<div class="mde-section-title">${this.title}</div>` : '';
    return `${title}
    <div class="mde-section-body"></div>`;
  }

  run() {
    $(`${this.containerSelector} .mde-section-body`).html(`Section of type ${this.schema.type} not implemented yet`);
  }
}