import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../Tid/Tid'
import { urlGen } from '../pages/common/SiteUrlGen'
import { ApmFormats } from '../pages/common/ApmFormats'
import { Statement } from '../EntityData/Statement'

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
        initialMode: { type: 'string', default: 'show'},
        isRelation: { type: 'boolean', required: true},
        canBeCancelled: { type: 'boolean', required: true},
        getEntityName: { type: 'function', default: async (id) => { return `[${Tid.toBase36String(id)}`} },
        getEntityType: { type: 'function', default: async (id) => { return -1}},
      }
    })
    let cleanOptions = oc.getCleanOptions(options);
    this.containerSelector = cleanOptions.containerSelector;
    this.canBeCancelled = cleanOptions.canBeCancelled;
    this.id = cleanOptions.id;
    this.label = cleanOptions.label;
    this.name = null;
    this.statements = cleanOptions.statements;
    this.isRelation = cleanOptions.isRelation;
    this.getEntityName = cleanOptions.getEntityName;
    this.getEntityType = cleanOptions.getEntityType;
    this.showUrl = cleanOptions.showUrl;
    this.showLogo = cleanOptions.showLogo;
    this.initialMode = cleanOptions.initialMode;
    let activeStatements = cleanOptions.statements
      .filter( (statement) => {
        return statement.predicate === this.id && statement['cancellationId'] === -1;
      });
    this.currentStatement = activeStatements.length === 0 ? null : activeStatements[0];
    
    this.debug = true;
  }

  async init() {
    $(this.containerSelector).html(await this.getHtml());
    this.objectElement = $(`${this.containerSelector} .mde-predicate-object`);
    this.editElement = $(`${this.containerSelector} .bpe-predicate-edit`);
    this.iconsSpan = $(`${this.containerSelector} .mde-predicate-icons`);
    this.editButton = $(`${this.containerSelector} .edit-button`);
    this.cancelButton = $(`${this.containerSelector} .cancel-button`);
    this.infoButton = $(`${this.containerSelector} .info-button`);
    this.objectElement.on('mouseenter', () => {
      this.iconsSpan.removeClass('ghost');
    });
    this.objectElement.on('mouseleave', () => {
      this.iconsSpan.addClass('ghost');
    });

    this.editButton.on('click', this.genOnClickEditButton());
    this.infoButton.on('click', this.genOnClickInfoButton());
    this.infoButton.popover({
      content: await this.getInfoPopoverHtml(),
      html: true,
      title: await this.getPredicateName(),
    }).on('mouseenter', () => {
      this.infoButton.popover('show');
    }).on('mouseleave', () => {
      this.infoButton.popover('hide');
    });
    this.cancelButton.on('click', this.genOnClickCancelButton());
    this.currentMode = 'show';

    if (this.initialMode === 'edit') {
      await this.switchToEditMode();
    }


  }

  async switchToEditMode() {

    if (this.isRelation) {
      // TODO: add object chooser controls
    } else {
      this.editElement
        .removeClass('hidden bpe-predicate-edit-relation')
        .addClass('bpe-predicate-edit-attribute')
        .html(await this.getEditModeHtmlForAttribute());

      this.attributeValueInput = $(`${this.containerSelector} .value-input`);
      this.attributeValueInput.val(this.currentStatement.object);

      $(`${this.containerSelector} .cancel-edit-button`).on('click', (ev) => {
        ev.preventDefault();
        this.switchToShowMode();
      })
      this.objectElement.addClass('hidden');
      this.currentMode = 'edit';
    }
  }

  switchToShowMode() {
    this.editElement.html('')
      .addClass('hidden')
      .removeClass('bpe-predicate-edit-attribute bpe-predicate-edit-relation');
    this.objectElement.removeClass('hidden');
    this.currentMode = 'show';
  }

  async getEditModeHtmlForAttribute() {
    return `<div>${await this.getPredicateName()}</div><div><input type="text" class="value-input"></div>
        <div>Note</div><div><input type="text" class="note-input" placeholder="Enter editorial note here"></div>
        <div class="status-div"></div> 
        <div><a class="btn btn-sm btn-secondary save-edit-button hidden">Save</a>
        <a class="btn btn-sm btn-secondary cancel-edit-button">Cancel</a></div>`
  }


  genOnClickEditButton() {
    return (ev) => {
      ev.preventDefault();
      if (this.currentMode === 'edit') {
        console.warn("Already in edit mode!");
        return;
      }
      this.switchToEditMode();
    }
  }

  genOnClickInfoButton() {
    return (ev) => {
      ev.preventDefault();
      this.debug && console.log(`Click on predicate ${this.id} INFO button`);
      this.infoButton.popover('hide');
    }
  }

  genOnClickCancelButton() {
    return (ev) => {
      ev.preventDefault();
      if (this.canBeCancelled === false) {
        console.warn(`Click on cancel button, but the predicate cannot be cancelled`);
      }
      this.debug && console.log(`Click on predicate ${this.id} CANCEL button`);
    }
  }


  /**
   * @return {Promise<string>}
   * @private
   */
  async getHtml() {
    let name = await this.getPredicateName();
    let editButton = `<a href="" class="edit-button" title="Click to edit ${name}"><i class="bi bi-pencil"></i></a>`;
    let cancellationButton = this.canBeCancelled ?
      `<a href="" class="cancel-button" title="Click to delete"><i class="bi bi-trash"></i></a>` : '';
    let infoButton = `<a href="" class="info-button" ><i class="bi bi-info-circle"></i></a>`
    return `<div class="mde-predicate-label">${await this.getLabelHtml()}</div><div class="mde-predicate-object ">${await this.getObjectHtml()}
    <span class="mde-predicate-icons ghost">
        ${editButton}
        ${cancellationButton}
        ${infoButton}
    </span> 
     </div>
     <div class="bpe-predicate-edit hidden"></div>

`;
  }




  /**
   * @return {Promise<string>}
   * @private
   */
  async getObjectHtml() {
    if (this.currentStatement === null) {
      return `<i>Not set</i>`;
    }
    if (this.isRelation) {
      let objectType = await this.getEntityType(this.currentStatement.object);
      let objectName = await this.getEntityName(this.currentStatement.object);
      if (objectType === -1) {
        return objectName;
      }
      return `<a href="${urlGen.siteEntityPage(objectType, this.currentStatement.object)}">${objectName}</a>`
    }
    if (this.showUrl) {
      return `<a href="${urlGen.entityExternalUrl(this.id, this.currentStatement.object)}" 
            target="_blank" title="Click to visit ${await this.getPredicateName()} page">${this.currentStatement.object}</a>`
    }

    return this.currentStatement.object;
  }


  async getPredicateName() {
    if (this.name === null) {
      this.name = this.label === '' ? await this.getEntityName(this.id) : this.label
    }
    return this.name;
  }
  /**
   * @private
   */
  async getLabelHtml() {
    let name = await this.getPredicateName();
    let label = `<b>${name}</b>:`;
    return this.showLogo ? `<img src="${urlGen.entityLogoUrl(this.id)}" class="mde-predicate-logo" alt="${name}" title="${name}">` : label;
  }

  async getInfoPopoverHtml() {
    if (this.currentStatement === null) {
      if (this.statements.length === 0) {
        // never been set
        return `<p><i>Never been edited</i></p>`
      }
      // previous edits
      return `<p class="bpe-popover-more-info-line">${this.statements.length} previous edit(s)</p><p>Click on the info icon to see full list</p>`
    }
    let author= Statement.getAuthor(this.currentStatement);
    let authorName = await this.getEntityName(author);
    let editorialNote = Statement.getEditorialNote(this.currentStatement) ?? '<i>No editorial note left</i>';
    let time = ApmFormats.time(Statement.getEditTimestamp(this.currentStatement));

    let html = `<p class="bpe-popover-ed-note">${editorialNote}</p><p class="bpe-popover-tagline">${authorName}, ${time}</p>`
    if (this.statements.length > 1) {
      html += `<p class="bpe-popover-more-info-line">There are ${this.statements.length - 1} more edit(s). Click on the info icon to see full list</p>`
    }
    return html;
  }



}