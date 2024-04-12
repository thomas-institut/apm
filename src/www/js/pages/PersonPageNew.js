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
    this.works = [];

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

    let worksApiData = await this.apmDataProxy.getPersonWorks(this.personData.tid);
    this.works = worksApiData['works'];
    $('div.works-div').html(this.getWorksDivHtml());
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

  async genContentHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: tr('People'), url:  urlGen.sitePeople()},
      { label: tr('Person Details'), active: true}
    ])
    let entityAdminHtml = '';
    if (this.isUserRoot()) {
      entityAdminHtml = `<div class="entity-admin">
                <a class="entity-page-button" href="${urlGen.siteEntity(this.personData.tid)}">[ ${tr('Entity Page')} ]</a>
                </div>`
    }

    let idsHtml = [
      {
        name: 'ORCiD',
        value: this.personData['orcidId'] ?? '',
        url: urlGen.orcidPage(this.personData['orcidId']),
        title: 'ORCiD',
        logoUrl: urlGen.logoOrcid()
      },
      {
        name: 'VIAF',
        value: this.personData['viafId'] ?? '',
        url: urlGen.viafPage(this.personData['viafId']),
        logoUrl: urlGen.logoViaf(),
        title: 'VIAF ID'
      },
      {
        name: 'GND',
        value: this.personData['gndId'] ?? '',
        url: urlGen.gndExplorePage(this.personData['gndId']),
        logoUrl: urlGen.logoGnd(),
        title: 'Gemeinsame Normdatei (GND) ID'
      },
      {
        name: 'WikiData',
        value: this.personData['wikiDataId'] ?? '',
        url: urlGen.wikiDataPage(this.personData['wikiDataId']),
        logoUrl: urlGen.logoWikiData(),
        title: 'WikiData Id'
      },
      {
        name: 'LoC',
        value: this.personData['locId'] ?? '',
        url: '',
        logoUrl: urlGen.logoLoc(),
        title: "US Library of Congress ID"
      }
    ].map( (idDef) => {
      if (idDef.value === '') {
        return '';
      }
      let html = '<div class="person-id">';
      let logoUrl = idDef.logoUrl ?? '';
      let logoHtml
      if (logoUrl === '') {
        logoHtml = `<span class="id-name" title="${idDef.title}">${idDef.name}</span>`
      } else {
        logoHtml = `<img class="id-logo" src="${logoUrl}" alt="${idDef.name}" title="${idDef.title}">`;
      }

      if (idDef.url !== '') {
        html += `${logoHtml}<a href="${idDef.url}" target="_blank" title="${idDef.title}"><span class="literal-value">${idDef.value}</span> <i class="bi bi-link-45deg"></i></a>`
      } else {
        html += `${logoHtml}<span class="literal-value" title="${idDef.title ?? ''}">${idDef.value}</span>`;
      }
      html += '</div>'
      return html;
    }).join('')

    let dataHtml = [
      [ tr('Sort Name'), this.personData['sortName']],
      [ tr('Date of Birth'), this.personData['dateOfBirth']],
      [ tr('Date of Death'), this.personData['dateOfDeath']],
    ].map ( (displayTuple) => {
      let [ predicateName, predicateValue] = displayTuple;
      return this.getPredicateHtml(predicateName, predicateValue);
    }).join('');

    let urlsHtml = this.personData.urls.map( (urlDef) => {
        return `<div class="person-url">${urlDef.name}: <a href="${urlDef.url}" target="_blank">${urlDef.url} <i class="bi bi-link-45deg"></i></a></div>`
    }).join('');



    return `
    <div>${breadcrumbHtml}</div>
     <h1 class="">${this.personData.name}</h1>
     
     <div class="section person-entity-data">${dataHtml}</div>
     <div class="section person-ids">${idsHtml}</div>
     <div class="section person-urls">
        ${urlsHtml !== '' ? "<h4>External Links</h4>" : ''}
        ${urlsHtml}
      </div>
     <div class="section person-admin">${entityAdminHtml}</div>
     <div class="section user-data">${await this.getUserDataHtml(this.personData)}</div>
     <div class="section works-div"></div>`;
  }

  getWorksDivHtml() {
    if (this.works.length === 0) {
      return '';
    }
    let html = `<h2>Works</h2>`;
    html += this.works.map( (work, index) => {
      return `<div class="work-div work-div-${index}"><a href="${urlGen.siteWorkPage(work['dareId'])}">${work['dareId']}: ${work['title']}</a></div>`;
    }).join('');
    return html;
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
      if (this.canManageUsers || !this.userData.isReadOnly) {
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