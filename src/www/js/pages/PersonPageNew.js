import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { urlGen } from './common/SiteUrlGen'
import { Tid } from '../Tid/Tid'
import { CollapsePanel } from '../widgets/CollapsePanel'
import { tr } from './common/SiteLang'
import { UserDocDataCommon } from './common/UserDocDataCommon'
import { ApmPage } from './ApmPage'
import { UserProfileEditorDialog } from './common/UserProfileEditorDialog'
import { MakeUserDialog } from './common/MakeUserDialog'


const CONTRIBUTION_MCE = 'mcEditions';
const CONTRIBUTION_TX = 'transcriptions';
const CONTRIBUTION_CT = 'collationTables';
export class PersonPageNew extends NormalPage {


  constructor (options) {
    super(options);

    let oc = new OptionsChecker({
      context: 'PersonPage',
      optionsDefinition: {
        tid: { type: 'number'},
        data: { type: 'object'},
        canManageUsers: { type: 'boolean'},
        userData: { type: 'object'}
      }
    })

    let cleanOptions = oc.getCleanOptions(options);

    console.log(`PersonPage options`);
    console.log(cleanOptions);
    this.personData = cleanOptions.data;
    this.personTid = cleanOptions.tid;
    this.canManageUsers = cleanOptions.canManageUsers;
    this.userData = cleanOptions.userData;

    this.userContributions = [];

    this.initPage().then( () => {
      console.log(`Page for person ${Tid.toBase36String(this.personTid)} (${this.personTid}) initialized`)
    })
  }

  async initPage () {
    await super.initPage();
    document.title = this.personData.name;
    if (this.personData.isUser) {
      $('button.edit-user-profile-btn').on('click', this.genOnClickEditUserProfileButton());
      this.mcEditionsCollapse = this.constructCollapse('#multi-chunk-editions', tr('Multi-Chunk Editions'), [ 'first'])
      this.chunkEditionsCollapse = this.constructCollapse('#chunk-editions', tr('Chunk Editions'))
      this.collationTablesCollapse = this.constructCollapse('#collation-tables', tr('Collation Tables'))
      this.transcriptionsCollapse = this.constructCollapse('#transcriptions', tr('Transcriptions'))
      await Promise.all( [
        this.fetchMultiChunkEditions(),
        this.fetchCollationTablesAndEditions(),
        this.fetchTranscriptions()
      ])

      if (this.userContributions.length === 0) {
          $("div.data-status").html(`<em>${tr('UserContributions:None')}</em>`);
      } else {
        $("div.data-status").addClass('hidden');
        this.userContributions.forEach( (contrib) => {
          switch(contrib) {
            case CONTRIBUTION_TX:
              $('#transcriptions').removeClass('hidden');
              break;

            case CONTRIBUTION_MCE:
              $('#multi-chunk-editions').removeClass('hidden');
              break;

            case CONTRIBUTION_CT:
              $('#chunk-editions').removeClass('hidden');
              $('#collation-tables').removeClass('hidden');
              break;
          }
        })
      }
    }
    else {
      $('button.edit-user-profile-btn').on('click', this.genOnClickMakeUserButton());
    }

  }

  async fetchMultiChunkEditions() {
    let data = await this.apmDataProxy.get(urlGen.apiUserGetMultiChunkEditionInfo(this.personTid));
    if (data.length !== 0) {
      this.userContributions.push(CONTRIBUTION_MCE);
      let html = UserDocDataCommon.generateMultiChunkEditionsListHtml(data);
      this.mcEditionsCollapse.setContent(html);
    }

  }

  async fetchCollationTablesAndEditions() {
    let data = await this.apmDataProxy.get(urlGen.apiUserGetCollationTableInfo(this.personTid))
    if (data['tableInfo'].length !== 0) {
      this.userContributions.push(CONTRIBUTION_CT);
      let listHtml = UserDocDataCommon.generateCtTablesAndEditionsListHtml(data['tableInfo'], data['workInfo'])
      this.chunkEditionsCollapse.setContent(listHtml.editions);
      this.collationTablesCollapse.setContent(listHtml.cTables);
    }

  }

  async fetchTranscriptions() {
    let data = await this.apmDataProxy.get(urlGen.apiTranscriptionsByUserDocPageData(this.personTid))
    if (data['docIds'].length !== 0) {
      this.userContributions.push(CONTRIBUTION_TX);
      this.transcriptionsCollapse.setContent(UserDocDataCommon.generateTranscriptionListHtml(data))
    }

  }

  constructCollapse(selector, title, headerClasses = []) {
    return new CollapsePanel({
      containerSelector: selector,
      title: title,
      content: ApmPage.genLoadingMessageHtml(),
      contentClasses: [ 'user-profile-section-content'],
      headerClasses: headerClasses,
      iconWhenHidden: '<small><i class="bi bi-caret-right-fill"></i></small>',
      iconWhenShown: '<small><i class="bi bi-caret-down-fill"></i></small>',
      iconAtEnd: true,
      headerElement: 'h3',
      initiallyShown: false,
      debug: false
    })
  }

  async genHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: tr('People'), url:  urlGen.sitePeople()},
      { label: tr('Person Details'), active: true}
    ])
    let dataHtml = [
      [ tr('Entity ID'), Tid.toBase36String(this.personData.tid)],
      [ tr('Sort Name'), this.personData['sortName']]
    ].map ( (displayTuple) => {
      let [ predicateName, predicateValue] = displayTuple;
      return this.getPredicateHtml(predicateName, predicateValue);
    }).join('')
    return `
    <div>${breadcrumbHtml}</div>
     <h1 class="">${this.personData.name}</h1>
     
     <div class="person-entity-data">
        ${dataHtml}
    </div>
    <div class="user-data">
        ${await this.getUserDataHtml(this.personData)}</div>`;
  }

  getPredicateHtml(predicateName, predicateValue, divClass = 'entity-predicate') {
    return `<div class="${divClass}"><span class="predicate">${predicateName}</span>: ${predicateValue}</div>`
  }

  /**
   * Get
   * @param {Object} personData
   * @return {Promise<string>}
   */
  async getUserDataHtml(personData) {
    if (!personData.isUser) {
      if (this.canManageUsers) {
        let userAdminHtml = `<button class="btn btn-primary edit-user-profile-btn">${tr('Make User')}</button>`;
        return ` <div class="user-admin">${userAdminHtml}</div>`;
      }
      return '';
    }
    let userAdminHtml = '';
    let userPrivateDataHtml = '';

    if (this.canManageUsers || this.userTid === this.personTid) {
      if (this.canManageUsers || !this.userData.isReadOnly()) {
        userAdminHtml = `<button class="btn btn-primary edit-user-profile-btn">Edit User Profile</button>`;
      }
      let privateDataToDisplay =  [
        [ tr('Username'), this.personData.userName],
        [ tr('User Email Address'), this.personData['userEmailAddress']]
        ];

      if (this.canManageUsers) {
        privateDataToDisplay.push(...[
          [ tr('Disabled'), this.userData.disabled ? tr('Yes') : tr('No')],
          [ tr('Root'), this.userData.root ? tr('Yes') : tr('No')],
          [ tr('Read Only'), this.userData.readOnly ? tr('Yes') : tr('No')],
          [ tr('Tags'), '[ ' + this.userData.tags.join(', ') + ' ]'],
        ])
      }

      userPrivateDataHtml = privateDataToDisplay.map ( (displayTuple) => {
        let [ predicateName, predicateValue] = displayTuple;
        return this.getPredicateHtml(predicateName, predicateValue);
      }).join('')


    }
    return `
        <div class="user-private-data">${userPrivateDataHtml}</div>
        <div class="user-admin">${userAdminHtml}</div>
        <h2>${tr('User Contributions')}</h2> 
        <div class="data-status user-profile-section">${ApmPage.genLoadingMessageHtml()}</div>
        <div id="multi-chunk-editions" class="user-profile-section hidden"></div>
        <div id="chunk-editions" class="user-profile-section hidden"></div>
        <div id="collation-tables" class="user-profile-section hidden"></div>
        <div id="transcriptions" class="user-profile-section hidden"></div>`
  }

  genOnClickEditUserProfileButton() {
    return () => {
      (new UserProfileEditorDialog({
        userData: this.userData,
        personData: this.personData,
        canManageUsers: this.canManageUsers,
        apmDataProxy: this.apmDataProxy,
      })).show().then( (profileUpdated) => {
        if (profileUpdated) {
          window.location.reload();
        }
      });
    }
  }

  genOnClickMakeUserButton () {
    return () => {
      (new MakeUserDialog({
        personData: this.personData,
        apmDataProxy: this.apmDataProxy,
      })).show().then( (userCreated) => {
        if (userCreated) {
          window.location.reload();
        }
      });
    }
  }

}

window.PersonPageNew = PersonPageNew;