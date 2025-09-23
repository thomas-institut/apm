import {NormalPage} from './NormalPage';
import {OptionsChecker} from '@thomas-inst/optionschecker';
import {urlGen} from './common/SiteUrlGen';
import {Tid} from '@/Tid/Tid';
import {CollapsePanel} from '@/widgets/CollapsePanel';
import {tr} from './common/SiteLang';
import {UserDocDataCommon} from './common/UserDocDataCommon';
import {ApmPage} from './ApmPage';
import {UserProfileEditorDialog} from './common/UserProfileEditorDialog';
import {MakeUserDialog} from './common/MakeUserDialog';
import * as Entity from '../constants/Entity';
import {MetadataEditorSchema} from '@/defaults/MetadataEditorSchemata/MetadataEditorSchema';
import {MetadataEditor2} from '@/MetadataEditor/MetadataEditor2';
import {SchemaInterface} from "@/defaults/MetadataEditorSchemata/SchemaInterface";
import {EntityDataInterface} from "../../schema/Schema";

const CONTRIBUTION_MCE = 'mcEditions';
const CONTRIBUTION_TX = 'transcriptions';
const CONTRIBUTION_CT = 'collationTables';

export class PersonPage extends NormalPage {
  private personData: any;
  private readonly personId: any;
  private readonly canManageUsers: any;
  private readonly userData: any;
  private userContributions: any[];
  private works: any[];
  private entityData!: EntityDataInterface;
  private schema: SchemaInterface | null = null;
  private mcEditionsCollapse!: CollapsePanel;
  private chunkEditionsCollapse!: CollapsePanel;
  private collationTablesCollapse!: CollapsePanel;
  private transcriptionsCollapse!: CollapsePanel;


  constructor(options: any) {
    super(options);

    let oc = new OptionsChecker({
      context: 'PersonPage', optionsDefinition: {
        personData: {type: 'object'}, canManageUsers: {type: 'boolean'},
      }
    });

    let cleanOptions = oc.getCleanOptions(options);

    console.log(`PersonPage options`);
    console.log(cleanOptions);
    this.personData = cleanOptions.personData;
    this.personId = this.personData.id;
    this.canManageUsers = cleanOptions.canManageUsers;
    this.userData = this.personData.userData;

    this.userContributions = [];
    this.works = [];

    this.initPage().then(() => {
      console.log(`Page for person ${Tid.toBase36String(this.personId)} (${this.personId}) initialized`);
    });
  }


  async initPage() {
    await super.initPage();
    document.title = this.personData.name;
    this.entityData = await this.apiClient.getEntityData(this.personId);
    this.schema = MetadataEditorSchema.getSchema(Entity.tPerson);
    console.log(`Entity Schema for type Person`, this.schema);


    // preload statement qualification object entities
    await this.apiClient.getStatementQualificationObjects(true);

    new MetadataEditor2({
      containerSelector: 'div.metadata-editor',
      entityDataSchema: this.schema,
      entityData: this.entityData,
      apiClient: this.apiClient,
    });

    if (this.personData.isUser) {
      $('button.edit-user-profile-btn').on('click', this.genOnClickEditUserProfileButton());
      this.mcEditionsCollapse = this.constructCollapse('#multi-chunk-editions', tr('Multi-Chunk Editions'), ['first']);
      this.chunkEditionsCollapse = this.constructCollapse('#chunk-editions', tr('Chunk Editions'));
      this.collationTablesCollapse = this.constructCollapse('#collation-tables', tr('Collation Tables'));
      this.transcriptionsCollapse = this.constructCollapse('#transcriptions', tr('Transcriptions'));
      await Promise.all([this.fetchMultiChunkEditions(), this.fetchCollationTablesAndEditions(), this.fetchTranscriptions()]);

      if (this.userContributions.length === 0) {
        $("div.data-status").html(`<em>${tr('UserContributions:None')}</em>`);
      } else {
        $("div.data-status").addClass('hidden');
        this.userContributions.forEach((contrib) => {
          switch (contrib) {
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
        });
      }
    } else {
      $('button.edit-user-profile-btn').on('click', this.genOnClickMakeUserButton());
    }

    let worksApiData = await this.apiClient.getPersonWorks(this.personData.id);
    this.works = worksApiData['works'];
    $('div.works-div').html(this.getWorksDivHtml());
  }

  async fetchMultiChunkEditions() {
    let data = await this.apiClient.get(urlGen.apiUserGetMultiChunkEditionInfo(this.personId));
    if (data.length !== 0) {
      this.userContributions.push(CONTRIBUTION_MCE);
      let html = UserDocDataCommon.generateMultiChunkEditionsListHtml(data);
      this.mcEditionsCollapse.setContent(html);
    }

  }

  async fetchCollationTablesAndEditions() {
    let data = await this.apiClient.get(urlGen.apiUserGetCollationTableInfo(this.personId));
    if (data['tableInfo'].length !== 0) {
      this.userContributions.push(CONTRIBUTION_CT);
      let listHtml = UserDocDataCommon.generateCtTablesAndEditionsListHtml(data['tableInfo'], data['workInfo']);
      this.chunkEditionsCollapse.setContent(listHtml.singleChunkEditions);
      this.collationTablesCollapse.setContent(listHtml.cTables);
    }

  }

  async fetchTranscriptions() {
    let data = await this.apiClient.userTranscriptions(this.personId);
    if (data['docIds'].length !== 0) {
      this.userContributions.push(CONTRIBUTION_TX);
      this.transcriptionsCollapse.setContent(UserDocDataCommon.generateTranscriptionListHtml(data));
    }

  }

  constructCollapse(selector: string, title: string, headerClasses: string[] = []) {
    return new CollapsePanel({
      containerSelector: selector,
      title: title,
      content: ApmPage.genLoadingMessageHtml(),
      contentClasses: ['user-profile-section-content'],
      headerClasses: headerClasses,
      iconWhenHidden: '<small><i class="bi bi-caret-right-fill"></i></small>',
      iconWhenShown: '<small><i class="bi bi-caret-down-fill"></i></small>',
      iconAtEnd: true,
      headerElement: 'h3',
      initiallyShown: false,
      debug: false
    });
  }

  async genContentHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([{
      label: tr('People'),
      url: urlGen.sitePeople()
    }, {label: tr('Person Details'), active: true}]);
    let entityAdminHtml = '';
    if (this.isUserRoot()) {
      entityAdminHtml = `<div class="entity-admin">
                <a class="entity-page-button" href="${urlGen.siteAdminEntity(this.personData.id)}">[ ${tr('Entity Page')} ]</a>
                <a class="dev-metadata-editor-button" href="${urlGen.siteDevMetadataEditor(this.personData.id)}">[ ${tr('Dev Metadata Editor')} ]</a>
                </div>`;
    }

    return `<div>${breadcrumbHtml}</div>
     <div class="metadata-editor"></div>
     <div class="section person-admin">${entityAdminHtml}</div>
     <div class="section user-data">${await this.getUserDataHtml()}</div>
     <div class="section works-div"></div>`;

  }

  getWorksDivHtml() {
    if (this.works.length === 0) {
      return '';
    }
    let html = `<h2>Works</h2>`;
    html += this.works.map((work, index) => {
      return `<div class="work-div work-div-${index}"><a href="${urlGen.siteWorkPage(work['workId'])}">${work['workId']}: ${work['title']}</a></div>`;
    }).join('');
    return html;
  }


  /**
   * Get
   * @return {Promise<string>}
   */
  async getUserDataHtml(): Promise<string> {
    if (!this.personData.isUser) {

      if (this.canManageUsers) {
        let userAdminHtml = `<button class="btn btn-primary edit-user-profile-btn">${tr('Make User')}</button>`;
        return ` <div class="user-admin">${userAdminHtml}</div>`;
      }
      return '';
    }
    let userAdminHtml = '';
    let userPrivateDataHtml = '';

    if (this.canManageUsers || this.userId === this.personId) {
      if (this.canManageUsers || !this.userData.isReadOnly) {
        userAdminHtml = `<button class="btn btn-primary edit-user-profile-btn">Edit User Profile</button>`;
      }
      let privateDataToDisplay = [[tr('Username'), this.userData.userName], [tr('User Email Address'), this.userData['emailAddress']]];

      if (this.canManageUsers) {
        privateDataToDisplay.push(...[[tr('Disabled'), this.userData.disabled ? tr('Yes') : tr('No')], [tr('Root'), this.userData.root ? tr('Yes') : tr('No')], [tr('Read Only'), this.userData.readOnly ? tr('Yes') : tr('No')], [tr('Tags'), '[ ' + this.userData.tags.join(', ') + ' ]'],]);
      }

      userPrivateDataHtml = privateDataToDisplay.map((displayTuple) => {
        let [predicateName, predicateValue] = displayTuple;
        return this.getPredicateHtml(predicateName, predicateValue);
      }).join('');


    }
    return `
        <div class="user-private-data">${userPrivateDataHtml}</div>
        <div class="user-admin">${userAdminHtml}</div>
        <h2>${tr('User Contributions')}</h2> 
        <div class="data-status user-profile-section">${ApmPage.genLoadingMessageHtml()}</div>
        <div id="multi-chunk-editions" class="user-profile-section hidden"></div>
        <div id="chunk-editions" class="user-profile-section hidden"></div>
        <div id="collation-tables" class="user-profile-section hidden"></div>
        <div id="transcriptions" class="user-profile-section hidden"></div>`;
  }

  genOnClickEditUserProfileButton() {
    return () => {
      (new UserProfileEditorDialog({
        userData: this.userData,
        personData: this.personData,
        canManageUsers: this.canManageUsers,
        apmDataProxy: this.apiClient,
      })).show().then((profileUpdated) => {
        if (profileUpdated) {
          window.location.reload();
        }
      });
    };
  }

  genOnClickMakeUserButton() {
    return () => {
      (new MakeUserDialog({
        personData: this.personData, apmDataProxy: this.apiClient,
      })).show().then((userCreated) => {
        if (userCreated) {
          window.location.reload();
        }
      });
    };
  }

}

(window as any).PersonPage = PersonPage;