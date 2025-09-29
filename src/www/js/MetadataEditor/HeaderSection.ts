import {MdeSection, MdeSectionOptions} from './MdeSection';
import {EntityData} from '@/EntityData/EntityData';
import * as Entity from '../constants/Entity';
import {Tid} from '@/Tid/Tid';
import {EntityDataInterface} from "@/Api/DataSchema/ApiEntity";

export class HeaderSection extends MdeSection {
  private readonly preDescriptionInfoStringProviders: any[];
  private readonly postDescriptionInfoStringProviders: any[];
  private nameElement!: JQuery;
  private descriptionElement!: JQuery<HTMLElement>;

  constructor(options: MdeSectionOptions) {
    super(options);
    this.preDescriptionInfoStringProviders = this.schema.preDescriptionInfoStrings ?? [];
    this.postDescriptionInfoStringProviders = this.schema.postDescriptionInfoStrings ?? [];
  }

  async getBootStrapHtml() {
    let preDescriptionDiv = '';

    if (this.preDescriptionInfoStringProviders.length !== 0) {
      preDescriptionDiv = '<div class="mde-header-pre-description">';
      preDescriptionDiv += this.preDescriptionInfoStringProviders.map((provider) => {
        return `<div class="info-string info-string-${provider}"></div>`;
      }).join('');
      preDescriptionDiv += '</div>';
    }
    let postDescriptionDiv = '';
    if (this.postDescriptionInfoStringProviders.length !== 0) {
      postDescriptionDiv = '<div class="mde-header-post-description">';
      postDescriptionDiv += this.postDescriptionInfoStringProviders.map((provider) => {
        return `<div class="info-string info-string-${provider}"></div>`;
      }).join('');
      postDescriptionDiv += '</div>';
    }

    return `
        <div class="mde-header-name">${this.entityData.name}</div>
        ${preDescriptionDiv}
        <div class="mde-header-description">${this.getDescription()}</div>
        ${postDescriptionDiv}
        <div class="mde-header-info">Entity ID: ${Tid.toCanonicalString(this.entityData.id)}</div>
`;
  }

  async updateInfoStrings() {
    let allProviders = [...this.preDescriptionInfoStringProviders, ...this.postDescriptionInfoStringProviders];
    for (let i = 0; i < allProviders.length; i++) {
      let providerName = allProviders[i];
      if (this.options.getInfoString !== undefined) {
        $(`${this.containerSelector} div.info-string-${providerName}`).html(await this.options.getInfoString(providerName) ?? '');
      }
    }
  }

  async updateEntityData(newEntityData: EntityDataInterface, updatedPredicates: number[]): Promise<boolean> {

    await super.updateEntityData(newEntityData, updatedPredicates);

    if (updatedPredicates.includes(Entity.pEntityName)) {
      this.nameElement.html(this.entityData.name);
    }

    if (updatedPredicates.includes(Entity.pEntityDescription)) {
      this.descriptionElement.html(this.getDescription());
    }
    await this.updateInfoStrings();
    return true;
  }

  getDescription(): string {
    let descriptionStatement = EntityData.getSingleCurrentStatement(this.entityData, Entity.pEntityDescription);
    return descriptionStatement === null ? '' : descriptionStatement.object.toString();
  }

  async init() {
    await super.init();
    this.nameElement = $(`${this.containerSelector} .mde-header-name`);
    this.descriptionElement = $(`${this.containerSelector} .mde-header-description`);
    await this.updateInfoStrings();
  }

  run() {
    // nothing to do for now
  }
}