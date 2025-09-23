/*
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import * as Entity from './constants/Entity';
import {Tid} from './Tid/Tid';
import {TimeString} from "@/toolbox/TimeString.mjs";

export class ApmUrlGenerator {
  private base: string = '';
  private apiBase!: string;

   constructor(baseUrl: string, apiUrl = '') {
    this.setBase(baseUrl, apiUrl);
  }


  setBase(url: string, apiUrl = '') {
    this.base = url;
    this.apiBase = apiUrl === '' ? url + '/api' : apiUrl;
  }

  // -------------------------------
  //  SITE
  // -------------------------------

  siteHome() {
    return this.base;
  }

  siteDashboard(): string {
    return `${this.base}/dashboard`;
  }

  siteLogout(): string {
    return `${this.base}/logout`;
  }

  siteLogin(): string {
    return `${this.base}/login`;
  }

  siteCollationTableCustom(work: string, chunkNumber: number, lang: string) {
    return this.base + '/collation-table/auto/' + work + '/' + chunkNumber + '/' + lang + '/custom';
  }

  siteCollationTablePreset(work: string, chunkNumber: number, presetId: number) {
    return this.base + '/collation-table/auto/' + work + '/' + chunkNumber + '/preset/' + presetId;
  }

  /**
   * If the input is a string, returns the string unchanged. Otherwise,
   * if necessary, converts the id to an integer and returns its base36 representation
   *
   * E.g.  'asdf' =>  'asdf',  1234 => '0000-00YA'
   *
   * @param {any}id
   * @return {string}
   */
  getFormattedId(id: string | number): string {
    if (typeof id === 'string') {
      return id;
    }
    return Tid.toBase36String(id);
  }

  sitePageView(docId: any, pageSequence: number, col: number | null = null): string {
    let url = `${this.base}/doc/${this.getFormattedId(docId)}/page/${pageSequence}/view`;
    if (col !== null && col > 0) {
      url += `/c/${col}`;
    }
    return url;
  }

  siteChunkPage(work: string, chunkNumber: number): string {
    return `${this.base}/work/${work}/chunk/${chunkNumber}`;
  }

  siteWorks(): string {
    return `${this.base}/works`;
  }

  siteWorkPage(workId: any): string {
    return `${this.base}/work/${this.getFormattedId(workId)}`;
  }

  /**
   *
   * @param {string}docId
   * @returns {string}
   */
  siteDocPage(docId: string|number): string {
    return `${this.base}/doc/${this.getFormattedId(docId)}`;
  }

  siteDocDefinePages(docId: string) {
    return `${this.base}/doc/${docId}/definepages`;
  }

  siteDocs() {
    return this.base + '/documents';
  }

  siteChunks() {
    return this.base + '/works';
  }

  siteUsers() {
    return this.base + '/users';
  }

  siteSearch() {
    return this.base + '/search';
  }

  siteSearchNew() {
    return this.base + '/searchnew';
  }

  sitePerson(id: any) {
    return `${this.base}/person/${this.getFormattedId(id)}`;
  }

  sitePeople() {
    return this.base + '/people';
  }

  siteMultiChunkEdition(editionId: number) {
    return `${this.base}/multi-chunk-edition/${editionId}`;
  }

  siteMultiChunkEditionNew() {
    return `${this.base}/multi-chunk-edition/new`;
  }

  siteCollationTableAutomatic(work: string, chunkNumber: number, lang: string, ids: (number | string)[] = []) {
    let extra = '';
    if (ids.length > 0) {
      extra = '/' + ids.join('/');
    }
    return this.base + '/collation-table/auto/' + work + '/' + chunkNumber + '/' + lang + extra;
  }

  siteCollationTableEdit(tableId: number, version = 0) {
    let postfix = '';
    if (version !== 0) {
      postfix = `/${version}`;
    }
    return `${this.base}/collation-table/${tableId}${postfix}`;
  }

  siteChunkEdition(editionId: number, version = 0) {
    let postfix = '';
    if (version !== 0) {
      postfix = `/${version}`;
    }
    return `${this.base}/chunk-edition/${editionId}${postfix}`;
  }

  siteChunkEditionNew(workId: string, chunkNumber: number, lang: string) {
    return `${this.base}/chunk-edition/new/${workId}/${chunkNumber}/${lang}`;
  }

  siteEditCollationTableBeta(tableId: number) {
    return this.base + '/collation-table/edit/' + tableId + '/beta';
  }

  siteBlankThumbnail() {
    return `${this.base}/images/thumbnail-blank.png`;
  }

  siteOpenSeadragonIconsPrefix() {
    return `${this.base}/node_modules/openseadragon/build/openseadragon/images/`;
  }

  /**
   *
   * @param {number}entityType
   * @param {number}entityId
   */
  siteEntityPage(entityType: number, entityId: number | string) {
    switch (entityType) {
      case Entity.tPerson:
        return this.sitePerson(this.getFormattedId(entityId));

      case Entity.tWork:
        return this.siteWorkPage(this.getFormattedId(entityId));

      case Entity.tDocument:
        return this.siteDocPage(this.getFormattedId(entityId));
    }
    return '';
  }

  siteAdminEntity(tid: number) {
    return `${this.base}/entity/${tid}/admin`;
  }

  siteDevMetadataEditor(tid: number) {
    return `${this.base}/dev/metadata-editor/${tid}`;
  }

  images() {
    return this.base + '/images';
  }


  // -------------------------------
  // API
  // -------------------------------

  // ADMIN
  apiAdminLog() {
    return `${this.apiBase}/admin/log`;
  }

  apiGetPageInfo() {
    return `${this.apiBase}/pages/info`;
  }

  apiWhoAmI() {
    return `${this.apiBase}/whoami`;
  }

  apiLogin() {
    return `${this.apiBase}/login`;
  }


  // TRANSCRIPTIONS

  apiTranscriptionsGetData(docId: any, pageNumber: number, col: number) {
    return `${this.apiBase}/transcriptions/${docId}/${pageNumber}/${col}/get`;
  }

  apiTranscriptionsGetDataWithVersion(docId: any, pageNumber: number, col: number, versionID: number) {
    return `${this.apiBase}/transcriptions/${docId}/${pageNumber}/${col}/get/version/${versionID}`;
  }

  apiTranscriptionsUpdateData(docId: any, pageNumber: number, col: number) {
    return `${this.apiBase}/transcriptions/${docId}/${pageNumber}/${col}/update`;
  }

  apiTranscriptionsByUserDocPageData(userTid: number) {
    return `${this.apiBase}/transcriptions/byUser/${userTid}/docPageData`;
  }

  apiGetNumColumns(docId: any, pageNumber: number) {
    return this.apiBase + '/' + docId + '/' + pageNumber + '/numcolumns';
  }

  apiDocGetDocId(docId: any) {
    return `${this.apiBase}/doc/getId/${docId}`;
  }

  apiAddColumn(docId: any, pageNumber: number) {
    return this.apiBase + '/' + docId + '/' + pageNumber + '/newcolumn';
  }

  apiUpdatePageSettings(pageId: number) {
    return this.apiBase + '/page/' + pageId + '/update';
  }

  openSeaDragonImagePrefix() {
    return this.base + '/node_modules/openseadragon/build/openseadragon/images/';
  }

  apiCreateUser(personId: number) {
    return `${this.apiBase}/user/create/${personId}`;
  }

  apiUserUpdateProfile(personId: number) {
    return `${this.apiBase}/user/${personId}/update`;
  }

  apiPersonGetEssentialData(personId: number) {
    return `${this.apiBase}/person/${personId}/data/essential`;
  }

  apiPersonGetDataForPeoplePage() {
    return `${this.apiBase}/person/all/dataForPeoplePage`;
  }

  apiPersonCreate() {
    return `${this.apiBase}/person/create`;
  }

  apiEntityGetSchema(entityType: number) {
    return `${this.apiBase}/entity/${entityType}/schema`;
  }

  apiEntityTypeGetEntities(entityType: number) {
    return `${this.apiBase}/entity/${entityType}/entities`;
  }

  apiUserGetCollationTableInfo(id: number) {
    return this.apiBase + '/user/' + id + '/collationTables';
  }

  apiUserGetMultiChunkEditionInfo(userId: number) {
    return `${this.apiBase}/user/${userId}/multiChunkEditions`;
  }

  apiBulkPageSettings() {
    return this.apiBase + '/page/bulkupdate';
  }

  apiAddPages(docId: any) {
    return this.apiBase + '/doc/' + docId + '/addpages';
  }

  apiGetPageTypes() {
    return `${this.apiBase}/page/types`;
  }

  apiTypesetRaw() {
    return this.apiBase + '/typeset/raw';
  }



  apiEntityGetData(tid: number) {
    return `${this.apiBase}/entity/${tid}/data`;
  }

  apiEntityGetPredicateDefinitionsForType(type: number) {
    return `${this.apiBase}/entity/${type}/predicateDefinitions`;
  }

  apiEntityGetStatementQualificationObjects(withData = true) {
    return `${this.apiBase}/entity/statementQualificationObjects${withData ? '/data' : ''}`;
  }

  apiEntityStatementsEdit() {
    return `${this.apiBase}/entity/statements/edit`;
  }

  // API: CollationTable

  apiCollationTable_auto() {
    return this.apiBase + '/collationTable/auto';
  }

  apiCollationTable_save() {
    return this.apiBase + '/collationTable/save';
  }

  apiCollationTable_activeEditions() {
    return `${this.apiBase}/collationTable/active/editions`;
  }

  apiCollationTable_activeForWork(workId: any) {
    return `${this.apiBase}/collationTable/active/forWork/${workId}`;
  }

  apiCollationTable_convertToEdition(tableId: number) {
    return `${this.apiBase}/collationTable/${tableId}/convertToEdition`;
  }

  apiCollationTable_get(tableId: number, compactEncodedTimeString = '') {
    if (compactEncodedTimeString !== '') {
      return `${this.apiBase}/collationTable/${tableId}/get/${compactEncodedTimeString}`;
    }
    return `${this.apiBase}/collationTable/${tableId}/get`;
  }

  apiCollationTable_versionInfo(tableId: number, timeStamp: string) {
    return `${this.apiBase}/collationTable/${tableId}/versionInfo/${TimeString.compactEncode(timeStamp)}`;
  }


  apiGetMultiChunkEdition(editionId: number, timeStamp = '') {
    if (timeStamp !== '') {
      return `${this.apiBase}/edition/multi/get/${editionId}/${timeStamp}`;
    }
    return `${this.apiBase}/edition/multi/get/${editionId}`;
  }

  apiSaveMultiChunkEdition() {
    return `${this.apiBase}/edition/multi/save`;
  }

  apiEditionSourcesGetAll() {
    return `${this.apiBase}/edition/sources/all`;
  }

  apiEditionSourcesGet(tid: number) {
    return `${this.apiBase}/edition/source/get/${tid}`;
  }

  apiWitnessToEdition(witnessId: string | number) {
    return `${this.apiBase}/witness/${witnessId}/to/edition`;
  }

  apiWorkGetInfoOld(workId: any) {
    return `${this.apiBase}/work/${workId}/old-info`;
  }

  apiWorkGetData(workId: any) {
    return `${this.apiBase}/work/${workId}/data`;
  }

  apiWorksGetAuthors() {
    return `${this.apiBase}/works/authors`;
  }

  apiWorkGetChunksWithTranscription(workId: any) {
    return `${this.apiBase}/work/${workId}/chunksWithTranscription`;
  }

  apiWorksAll() {
    return `${this.apiBase}/works/all`;
  }



  apiPersonGetWorks(personId: number) {
    return `${this.apiBase}/person/${personId}/works`;
  }

  apiDocumentCreate() {
    return `${this.apiBase}/doc/create`;
  }


  apiDocumentsAllDocumentsData() {
    return `${this.apiBase}/docs/all`;
  }

  apiAutomaticEdition() {
    return this.apiBase + '/edition/auto';
  }

  apiGetPresets() {
    return this.apiBase + '/presets/get';
  }

  apiPostPresets() {
    return this.apiBase + '/presets/post';
  }

  apiDeletePreset(id: number) {
    return this.apiBase + '/presets/delete/' + id;
  }

  apiGetAutomaticCollationPresets() {
    return this.apiBase + '/presets/act/get';
  }

  apiGetSiglaPresets() {
    return this.apiBase + '/presets/sigla/get';
  }

  apiSaveSiglaPreset() {
    return this.apiBase + '/presets/sigla/save';
  }

  apiWitnessGet(witnessId: any, output = 'full') {
    return this.apiBase + '/witness/get/' + witnessId + '/' + output;
  }

  apiWitnessCheckUpdates() {
    return this.apiBase + '/witness/check/updates';
  }

  apiSearchKeyword() {
    return `${this.apiBase}/search/keyword`;
  }

  apiSearchTranscribers() {
    return `${this.apiBase}/search/transcribers`;
  }

  apiSearchTranscriptionTitles() {
    return `${this.apiBase}/search/transcriptions`;
  }

  apiSearchEditors() {
    return `${this.apiBase}/search/editors`;
  }

  apiSearchEditionTitles() {
    return `${this.apiBase}/search/editions`;
  }

  apiSystemGetLanguages() {
    return `${this.apiBase}/system/languages`;
  }

  apiPeopleSaveData() {
    return `${this.apiBase}/person/save`;
  }

  apiPeopleGetSchema() {
    return `${this.apiBase}/person/schema`;
  }

  apiPeopleGetNewId() {
    return `${this.apiBase}/person/newid`;
  }


  // External

  viafPage(viafId: string) {
    return `https://viaf.org/viaf/${viafId}`;
  }

  wikiDataPage(wikiDataId: string) {
    return `https://www.wikidata.org/wiki/${wikiDataId}`;
  }

  orcidPage(orcidId: string) {
    return `https://orcid.org/${orcidId}`;
  }

  gndExplorePage(gndId: string) {
    return `https://explore.gnd.network/gnd/${gndId}`;
  }

  /**
   * Returns the logo associated with an entity id.
   *
   * Normally the entity is a predicate, for example, an external ID
   * @param {number}entityId
   * @return {string}
   */
  entityLogoUrl(entityId: number): string {
    switch (entityId) {
      case Entity.pOrcid:
        return `${this.images()}/orcid-logo.svg`;
      case Entity.pViafId:
        return `${this.images()}/viaf-logo.svg`;
      case Entity.pGNDId:
        return `${this.images()}/gnd-logo.svg`;
      case Entity.pWikiDataId:
        return `${this.images()}/wikidata-logo.svg`;
      case Entity.pLocId:
        return `${this.images()}/loc-logo.svg`;
    }
    return '';
  }

  /**
   * Returns an external url for predicate and its object
   *
   * @param {number}predicateId
   * @param {number|string}predicateObject
   * @return {string}
   */
  entityExternalUrl(predicateId: number, predicateObject: string): string {
    switch (predicateId) {
      case Entity.pOrcid:
        return this.orcidPage(predicateObject);
      case Entity.pViafId:
        return this.viafPage(predicateObject);
      case Entity.pGNDId:
        return this.gndExplorePage(predicateObject);
      case Entity.pWikiDataId:
        return this.wikiDataPage(predicateObject);
      case Entity.pUrl:
        return predicateObject;
    }
    return '';
  }


}
