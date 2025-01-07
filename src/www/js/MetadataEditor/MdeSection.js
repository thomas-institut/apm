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
        sectionSchema: { type: 'object', required: true},
        /**
         * Async function to be called when the section originates a change in entity data
         * It should return a boolean.
         */
        onEntityDataChange: { type: 'function', default: async (newData, changedPredicates) => {
          console.log(`Faking onEntityDataChange`, newData, changedPredicates);
          return false;
        }},
        /**
         * async function to be called when the section needs a string given by a named provider
         * it must return a string or null if the provider is undefined
         */
        getInfoString: { type: 'function', default: async (providerName) => {
          console.log(`getInfoString not set, called with provider name '${providerName}'`);
          return null;
        }}
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

  /**
   * Updates the entity data in the section
   * Should not be called when the section itself originated the change in data
   *
   * @param {{}}newEntityData
   * @param {number[]}updatedPredicates a list of predicates that have changed in the new entity data
   * @return {Promise<boolean>}
   */
  async updateEntityData(newEntityData, updatedPredicates) {
    this.entityData = newEntityData;
    return true;
  }


  run() {
    $(`${this.containerSelector} .mde-section-body`).html(`Section of type ${this.schema.type} not implemented yet`);
  }
}