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

import * as Entity from './constants/Entity'
import { Tid } from './Tid/Tid'

export class ApmUrlGenerator {
    private base: string;

    /**
     *
     * @param {string }baseUrl
     */
    constructor(baseUrl: string) {
        this.base = baseUrl;
    }

    /**
     *
     * @param {string}url
     */
    setBase(url: string) {
        this.base = url
    }

    getBaseUrl() {
        return this.base
    }

    // -------------------------------
    //  SITE
    // -------------------------------

    siteHome() {
        return this.base;
    }

    siteDashboard(): string {
        return `${this.base}/dashboard`
    }

    siteLogout(): string {
        return `${this.base}/logout`
    }

    siteCollationTableCustom(work: string, chunkNumber : number, lang : string) {
        return this.base + '/collation-table/auto/' + work + '/' + chunkNumber + '/' + lang + '/custom';
    }
    siteCollationTablePreset(work : string, chunkNumber: number, presetId: number) {
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
    getFormattedId(id:any): string {
        if (typeof id === 'string') {
            return id;
        }
        if (typeof id === 'number') {
            return Tid.toBase36String(id);
        }

        return Tid.toBase36String(parseInt(id.toString()));
    }

    sitePageView(docId: any, pageSequence: number, col: number|null = null): string {
        let url = `${this.base}/doc/${this.getFormattedId(docId)}/page/${pageSequence}/view`;
        if (col !== null && col > 0) {
            url += `/c/${col}`
        }
        return url;
    }

    siteChunkPage(work: string, chunkNumber : number): string {
        return `${this.base}/work/${work}/chunk/${chunkNumber}`
    }

    siteWorks() : string{
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
    siteDocPage(docId: string): string {
        return `${this.base}/doc/${this.getFormattedId(docId)}`;
    }

    siteDocDefinePages(docId: string) {
        return `${this.base}/doc/${docId}/definepages`
    }

    siteDocs() {
        return this.base + '/documents'
    }

    siteChunks() {
        return this.base + '/works'
    }

    siteUsers() {
        return this.base + '/users'
    }

    siteSearch() {
        return this.base + '/search'
    }

    siteSearchNew() {
        return this.base + '/searchnew'
    }

    sitePerson(id: any) {
        return `${this.base}/person/${this.getFormattedId(id)}`;
    }

    sitePeople() {
        return this.base + '/people'
    }

    siteMultiChunkEdition(editionId:number) {
        return `${this.base}/multi-chunk-edition/${editionId}`
    }

    siteMultiChunkEditionNew() {
        return `${this.base}/multi-chunk-edition/new`
    }

    siteCollationTableAutomatic(work : string, chunkNumber: number, lang: string, ids : (number|string)[] = []) {
        let extra = '';
        if (ids.length > 0) {
            extra = '/' + ids.join('/');
        }
        return this.base + '/collation-table/auto/' + work + '/' + chunkNumber + '/' + lang + extra;
    }
    siteCollationTableEdit(tableId: number, version = 0) {
        let postfix = ''
        if (version !== 0) {
            postfix = `/${version}`
        }
        return `${this.base}/collation-table/${tableId}${postfix}`
    }

    siteChunkEdition(editionId: number, version = 0) {
        let postfix = ''
        if (version !== 0) {
            postfix = `/${version}`
        }
        return `${this.base}/chunk-edition/${editionId}${postfix}`
    }

    siteChunkEditionNew(workId: string, chunkNumber: number, lang: string) {
        return `${this.base}/chunk-edition/new/${workId}/${chunkNumber}/${lang}`;
    }

    siteEditCollationTableBeta(tableId: number) {
        return this.base + '/collation-table/edit/' + tableId + '/beta'
    }

    siteBlankThumbnail() {
        return `${this.base}/images/thumbnail-blank.png`
    }

    siteOpenSeadragonIconsPrefix() {
        return `${this.base}/node_modules/openseadragon/build/openseadragon/images/`
    }

    /**
     *
     * @param {number}entityType
     * @param {number}entityId
     */
    siteEntityPage(entityType: number, entityId: number|string) {
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


    // -------------------------------
    // API
    // -------------------------------

    // ADMIN
    apiAdminLog() {
        return `${this.base}/api/admin/log`
    }

    apiGetPageInfo() {
        return `${this.base}/api/pages/info`
    }


    // TRANSCRIPTIONS

    apiTranscriptionsGetData(docId: any, pageNumber: number, col: number) {
        return `${this.base}/api/transcriptions/${docId}/${pageNumber}/${col}/get`
    }
    apiTranscriptionsGetDataWithVersion(docId: any, pageNumber:number, col: number, versionID: number) {
        return `${this.base}/api/transcriptions/${docId}/${pageNumber}/${col}/get/version/${versionID}`
    }
    apiTranscriptionsUpdateData(docId: any, pageNumber: number, col: number) {
        return `${this.base}/api/transcriptions/${docId}/${pageNumber}/${col}/update`
    }

    apiTranscriptionsByUserDocPageData(userTid: number) {
        return `${this.base}/api/transcriptions/byUser/${userTid}/docPageData`
    }

    apiGetNumColumns(docId: any, pageNumber: number) {
        return this.base + '/api/' + docId + '/' + pageNumber + '/numcolumns';
    }

    apiDocGetDocId(docId: any) {
        return `${this.base}/api/doc/getId/${docId}`;
    }

    apiAddColumn(docId: any, pageNumber: number) {
        return this.base + '/api/' + docId + '/' + pageNumber + '/newcolumn';
    }
    apiUpdatePageSettings(pageId: number) {
        return this.base + '/api/page/' + pageId + '/update';
    }
    openSeaDragonImagePrefix() {
        return this.base + '/node_modules/openseadragon/build/openseadragon/images/';
    }
    apiCreateUser(personId: number) {
        return `${this.base}/api/user/create/${personId}`;
    }

    apiUpdateProfile(personId: number) {
        return `${this.base}/api/user/${personId}/update`;
    }

    apiPersonGetEssentialData(personId: number) {
        return `${this.base}/api/person/${personId}/data/essential`;
    }

    apiPersonGetDataForPeoplePage() {
        return `${this.base}/api/person/all/dataForPeoplePage`;
    }

    apiPersonCreate() {
        return `${this.base}/api/person/create`;
    }

    apiEntityGetSchema(entityType: number) {
        return `${this.base}/api/entity/${entityType}/schema`;
    }

    apiEntityTypeGetEntities(entityType: number) {
        return `${this.base}/api/entity/${entityType}/entities`
    }

    apiUserGetCollationTableInfo(id: number) {
        return this.base + '/api/user/' + id + '/collationTables';
    }
    apiUserGetMultiChunkEditionInfo(tid: number) {
        return `${this.base}/api/user/${tid}/multiChunkEditions`
    }

    apiBulkPageSettings() {
        return this.base + '/api/page/bulkupdate';
    }
    apiAddPages(docId:  any) {
        return this.base + '/api/doc/' + docId + '/addpages';
    }

    apiGetPageTypes() {
        return `${this.base}/api/page/types`
    }
    apiQuickCollation() {
        return this.base + '/api/public/collation-table/quick';
    }


    apiTypesetRaw() {
        return this.base + '/api/typeset/raw'
    }

    apiConvertCollationTable(tableId: number) {
        return `${this.base}/api/collation-table/convert/${tableId}`;
    }

    apiEntityGetData(tid: number) {
        return `${this.base}/api/entity/${tid}/data`
    }

    apiEntityGetPredicateDefinitionsForType(type: number) {
        return `${this.base}/api/entity/${type}/predicateDefinitions`
    }

    apiEntityGetStatementQualificationObjects(withData = true) {
        return `${this.base}/api/entity/statementQualificationObjects${withData ? '/data' : ''}`;
    }

    apiEntityStatementsEdit() {
        return `${this.base}/api/entity/statements/edit`
    }

    siteAdminEntity(tid: number) {
        return `${this.base}/entity/${tid}/admin`;
    }

    siteDevMetadataEditor(tid: number) {
        return `${this.base}/dev/metadata-editor/${tid}`;
    }

    apiGetCollationTable(tableId: number, compactEncodedTimeString = '') {
        if (compactEncodedTimeString !== '') {
            return `${this.base}/api/collation-table/get/${tableId}/${compactEncodedTimeString}`
        }
        return `${this.base}/api/collation-table/get/${tableId}`
    }

    apiGetActiveEditionInfo() {
        return `${this.base}/api/collation-table/info/edition/active`
    }

    apiGetMultiChunkEdition(editionId: number, timeStamp = '') {
        if (timeStamp !== '') {
            return `${this.base}/api/edition/multi/get/${editionId}/${timeStamp}`
        }
        return `${this.base}/api/edition/multi/get/${editionId}`
    }

    apiSaveMultiChunkEdition() {
        return `${this.base}/api/edition/multi/save`
    }

    apiEditionSourcesGetAll() {
        return `${this.base}/api/edition/sources/all`
    }

    apiEditionSourcesGet(tid: number) {
        return `${this.base}/api/edition/source/get/${tid}`;
    }

    apiWitnessToEdition(witnessId: string|number) {
        return `${this.base}/api/witness/${witnessId}/to/edition`;
    }

    apiWorkGetInfoOld(workId: any) {
        return `${this.base}/api/work/${workId}/old-info`;
    }

    apiWorkGetData(workId: any) {
        return `${this.base}/api/work/${workId}/data`;
    }

    apiWorksGetAuthors() {
        return `${this.base}/api/works/authors`;
    }

    apiWorkGetChunksWithTranscription(workId: any) {
        return `${this.base}/api/work/${workId}/chunksWithTranscription`;
    }

    apiCollationTableGetActiveTablesForWork(workId: any) {
        return`${this.base}/api/collation-table/active/work/${workId}`
    }

    apiPersonGetWorks(personId: number) {
        return `${this.base}/api/person/${personId}/works`;
    }
    apiDocumentCreate() {
        return `${this.base}/api/doc/create`
    }

    apiAutomaticCollation() {
        return this.base + '/api/collation-table/auto';
    }
    apiSaveCollation() {
        return this.base + '/api/collation-table/save';
    }
    apiAutomaticEdition() {
        return this.base + '/api/edition/auto';
    }
    apiGetPresets() {
        return this.base + '/api/presets/get';
    }
    apiPostPresets() {
        return this.base + '/api/presets/post';
    }
    apiDeletePreset(id: number) {
        return this.base + '/api/presets/delete/' + id;
    }
    apiGetAutomaticCollationPresets() {
        return this.base + '/api/presets/act/get';
    }
    apiGetSiglaPresets() {
        return this.base + '/api/presets/sigla/get';
    }
    apiSaveSiglaPreset() {
        return this.base + '/api/presets/sigla/save';
    }
    apiWitnessGet(witnessId: any, output = 'full') {
        return this.base + '/api/witness/get/' + witnessId + '/' + output;
    }
    apiWitnessCheckUpdates() {
        return this.base + '/api/witness/check/updates';
    }

    apiSearchKeyword() {
        return `${this.base}/api/search/keyword`
    }
    apiSearchTranscribers() {
        return `${this.base}/api/search/transcribers`
    }

    apiSearchTranscriptionTitles() {
        return `${this.base}/api/search/transcriptions`
    }

    apiSearchEditors() {
        return `${this.base}/api/search/editors`
    }

    apiSearchEditionTitles() {
        return `${this.base}/api/search/editions`
    }

    apiSystemGetLanguages() {
        return `${this.base}/api/system/languages`
    }

    apiPeopleSaveData() {
        return `${this.base}/api/person/save`
    }

    apiPeopleGetSchema() {
        return `${this.base}/api/person/schema`
    }

    apiPeopleGetNewId() {
        return `${this.base}/api/person/newid`
    }

    images() {
        return this.base + '/images'
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
    entityLogoUrl(entityId: number) {
        switch(entityId) {
            case Entity.pOrcid: return `${this.images()}/orcid-logo.svg`;
            case Entity.pViafId:  return `${this.images()}/viaf-logo.svg`;
            case Entity.pGNDId:  return `${this.images()}/gnd-logo.svg`;
            case Entity.pWikiDataId: return `${this.images()}/wikidata-logo.svg`;
            case Entity.pLocId: return `${this.images()}/loc-logo.svg`;
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
    entityExternalUrl(predicateId: number, predicateObject: string) {
        switch(predicateId) {
            case Entity.pOrcid: return this.orcidPage(predicateObject);
            case Entity.pViafId:  return this.viafPage(predicateObject);
            case Entity.pGNDId:  return this.gndExplorePage(predicateObject);
            case Entity.pWikiDataId: return this.wikiDataPage(predicateObject);
            case Entity.pUrl: return predicateObject;
        }
        return ''
    }



}
