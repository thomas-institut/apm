import { MdeSection } from './MdeSection'
import { EntityData } from '../EntityData/EntityData'
import * as Entity from '../constants/Entity'
import { Tid } from '../Tid/Tid'

export class EditableHeaderSection extends MdeSection {


  async getBootStrapHtml () {

    return `
        <div class="mde-header-name">${this.entityData.name}</div>
        <div class="mde-header-description">${this.getDescription()}</div>
        <div class="mde-header-info">Entity ID: ${Tid.toBase36String(this.entityData.id)}</div>
`
  }

  async updateEntityData (newEntityData, updatedPredicates) {
    await super.updateEntityData(newEntityData, updatedPredicates);

    if (updatedPredicates.includes(Entity.pEntityName)) {
      this.nameElement.html(this.entityData.name);
    }

    if (updatedPredicates.includes(Entity.pEntityDescription)) {
      this.descriptionElement.html(this.getDescription());
    }
    return true;
  }

  getDescription() {
    let descriptionStatement = EntityData.getSingleCurrentStatement(this.entityData, Entity.pEntityDescription)
    return descriptionStatement === null ? '' : descriptionStatement.object;
  }

  async init() {
    await super.init();
    this.nameElement = $(`${this.containerSelector} .mde-header-name`);
    this.descriptionElement = $(`${this.containerSelector} .mde-header-description`);
  }

  run() {
    // do nothing for now
  }
}