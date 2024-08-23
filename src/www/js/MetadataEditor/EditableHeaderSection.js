import { MdeSection } from './MdeSection'
import { EntityData } from '../EntityData/EntityData'
import * as Entity from '../constants/Entity'
import { Tid } from '../Tid/Tid'

export class EditableHeaderSection extends MdeSection {


  async getBootStrapHtml () {
    let descriptionStatement = EntityData.getSingleCurrentStatement(this.entityData, Entity.pEntityDescription)
    let description = descriptionStatement === null ? '' : descriptionStatement.object;
    return `
        <div class="mde-header-name">${this.entityData.name}</div>
        <div class="mde-header-description">${description}</div>
        <div class="mde-header-info">Entity ID: ${Tid.toBase36String(this.entityData.id)}</div>
`
  }

  run() {
    // do nothing for now
  }
}