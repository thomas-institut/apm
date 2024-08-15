import { MdeSection } from './MdeSection'

export class EditableHeaderSection extends MdeSection {


  async getBootStrapHtml () {
    return `
        <div class="mde-header-name">${this.entityData.name}</div>
        <div class="mde-header-description"></div>
`
  }

  run() {
    // do nothing for now
  }
}