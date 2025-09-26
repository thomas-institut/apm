import {OptionsChecker} from '@thomas-inst/optionschecker';
import {ApmApiClient} from '@/Api/ApmApiClient';

import {EntityDataInterface, PredicateDefinitionInterface} from "@/Api/DataSchema/ApiEntity";
import {SectionSchema} from "@/MetadataEditor/MetadataEditorSchemata/SchemaInterface";

export interface MdeSectionOptions {
  containerSelector: string;
  entityData: EntityDataInterface;
  predicateDefinitions: PredicateDefinitionInterface[];
  qualificationDefinitions: PredicateDefinitionInterface[];
  apiClient: ApmApiClient;
  sectionSchema: SectionSchema;
  onEntityDataChange: (newData: EntityDataInterface, changedPredicates: number[]) => Promise<boolean[]>;
  getInfoString?: (providerName: string) => Promise<string | null>;
}

/**
 * A section in the metadata editor
 */
export class MdeSection {
  protected options: MdeSectionOptions;
  protected entityData: EntityDataInterface;
  protected schema: SectionSchema;
  protected title: string;
  protected containerSelector: string;
  protected apiClient: ApmApiClient;
  protected predicateDefinitions: PredicateDefinitionInterface[];
  protected qualificationDefinitions: PredicateDefinitionInterface[];


  constructor(options: MdeSectionOptions) {
    const oc = new OptionsChecker({
      context: "MdeSection", optionsDefinition: {
        containerSelector: {type: 'string', required: true},
        entityData: {type: 'object', required: false, default: {}},
        predicateDefinitions: {type: 'object', required: true},
        qualificationDefinitions: {type: 'object', required: true},
        apiClient: {type: 'object', objectClass: ApmApiClient, required: true},
        sectionSchema: {type: 'object', required: true},
        /**
         * Async function to be called when the section originates a change in entity data
         * It should return a boolean.
         */
        onEntityDataChange: {
          type: 'function', default: async (newData: any, changedPredicates: any) => {
            console.log(`Faking onEntityDataChange`, newData, changedPredicates);
            return false;
          }
        },
        /**
         * async function to be called when the section needs a string given by a named provider
         * it must return a string or null if the provider is undefined
         */
        getInfoString: {
          type: 'function', default: async (providerName: string): Promise<string | null> => {
            console.log(`getInfoString not set, called with provider name '${providerName}'`);
            return null;
          }
        }
      }
    });
    this.options = oc.getCleanOptions(options);
    this.entityData = this.options.entityData;
    this.schema = this.options.sectionSchema;
    this.title = this.schema.title ?? '';
    this.containerSelector = this.options.containerSelector;
    this.apiClient = this.options.apiClient;
    this.predicateDefinitions = this.options.predicateDefinitions;
    this.qualificationDefinitions = this.options.qualificationDefinitions;
  }

  async init() {
    $(this.containerSelector).html(await this.getBootStrapHtml());
    // this.bodyElement = $(`${this.containerSelector} .mde-section-body`);
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
   * @param {number[]}_updatedPredicates a list of predicates that have changed in the new entity data
   * @return {Promise<boolean>}
   */
  async updateEntityData(newEntityData: any, _updatedPredicates: number[]): Promise<boolean> {
    this.entityData = newEntityData;
    return true;
  }


  run() {
    $(`${this.containerSelector} .mde-section-body`).html(`Section of type ${this.schema.type} not implemented yet`);
  }
}