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

    /**
     *
     * @param {string }baseUrl
     */
    constructor(baseUrl) {
        this.base = baseUrl;
    }

    /**
     *
     * @param {string}url
     */
    setBase(url) {
        this.base = url
    }

    getBaseUrl() {
        return this.base
    }

    // -------------------------------
    //  SITE
    // -------------------------------

    siteHome() {
        return this.base
    }

    siteDashboard() {
        return `${this.base}/dashboard`
    }

    siteLogout() {
        return `${this.base}/logout`
    }

    siteCollationTableCustom(work, chunkno, lang) {
        return this.base + '/collation-table/auto/' + work + '/' + chunkno + '/' + lang + '/custom';
    }
    siteCollationTablePreset(work, chunkno, presetId) {
        return this.base + '/collation-table/auto/' + work + '/' + chunkno + '/preset/' + presetId;
    }

    /**
     * If the input is a string, returns the string unchanged. Otherwise,
     * if necessary, converts the id to an integer and returns its base36 representation
     *
     * E.g.  'asdf' =>  'asdf',  1234 => '0000-00YA'
     *
     * @param {string|number}id
     * @return {string}
     */
    getFormattedId(id) {
        if (typeof id === 'string') {
            return id;
        }
        if (typeof id === 'number') {
            return Tid.toBase36String(id);
        }

        return Tid.toBase36String(parseInt(id.toString()));
    }

    /**
     *
     * @param {string|number}docId
     * @param {number}pageSequence
     * @param {number|null}col
     * @returns {string}
     */
    sitePageView(docId, pageSequence, col = null) {
        let url = `${this.base}/doc/${this.getFormattedId(docId)}/page/${pageSequence}/view`;
        if (col > 0) {
            url += `/c/${col}`
        }
        return url;
    }

    siteChunkPage(work, chunk) {
        return `${this.base}/work/${work}/chunk/${chunk}`
    }

    siteWorks() {
        return `${this.base}/works`;
    }

    siteWorkPage(workId) {
        return `${this.base}/work/${this.getFormattedId(workId)}`;
    }

    /**
     *
     * @param {string|number}docId
     * @returns {string}
     */
    siteDocPage(docId) {
        return `${this.base}/doc/${this.getFormattedId(docId)}`;
    }

    siteDocDefinePages(docId) {
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

    sitePerson(id) {
        return `${this.base}/person/${this.getFormattedId(id)}`;
    }

    sitePeople() {
        return this.base + '/people'
    }

    siteMultiChunkEdition(editionId) {
        return `${this.base}/multi-chunk-edition/${editionId}`
    }

    siteMultiChunkEditionNew() {
        return `${this.base}/multi-chunk-edition/new`
    }

    siteCollationTableAutomatic(work, chunkNumber, lang, ids = []) {
        let extra = '';
        if (ids.length > 0) {
            extra = '/' + ids.join('/');
        }
        return this.base + '/collation-table/auto/' + work + '/' + chunkNumber + '/' + lang + extra;
    }
    siteCollationTableEdit(tableId, version = 0) {
        let postfix = ''
        if (version !== 0) {
            postfix = `/${version}`
        }
        return `${this.base}/collation-table/${tableId}${postfix}`
    }

    siteChunkEdition(editionId, version = 0) {
        let postfix = ''
        if (version !== 0) {
            postfix = `/${version}`
        }
        return `${this.base}/chunk-edition/${editionId}${postfix}`
    }

    siteChunkEditionNew(workId, chunkNumber, lang) {
        return `${this.base}/chunk-edition/new/${workId}/${chunkNumber}/${lang}`;
    }

    siteEditCollationTableBeta(tableId) {
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
    siteEntityPage(entityType, entityId) {
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

    apiTranscriptionsGetData(docId, pageNumber, col) {
        return `${this.base}/api/transcriptions/${docId}/${pageNumber}/${col}/get`
    }
    apiTranscriptionsGetDataWithVersion(docId, pageNumber, col, versionID) {
        return `${this.base}/api/transcriptions/${docId}/${pageNumber}/${col}/get/version/${versionID}`
    }
    apiTranscriptionsUpdateData(docId, pageNumber, col) {
        return `${this.base}/api/transcriptions/${docId}/${pageNumber}/${col}/update`
    }

    apiTranscriptionsByUserDocPageData(userTid) {
        return `${this.base}/api/transcriptions/byUser/${userTid}/docPageData`
    }

    apiGetNumColumns(docId, pageNumber) {
        return this.base + '/api/' + docId + '/' + pageNumber + '/numcolumns';
    }

    apiDocGetDocId(docId) {
        return `${this.base}/api/doc/getId/${docId}`;
    }

    apiAddColumn(docId, pageNumber) {
        return this.base + '/api/' + docId + '/' + pageNumber + '/newcolumn';
    }
    apiUpdatePageSettings(pageId) {
        return this.base + '/api/page/' + pageId + '/update';
    }
    openSeaDragonImagePrefix() {
        return this.base + '/node_modules/openseadragon/build/openseadragon/images/';
    }
    apiCreateUser(tid) {
        return `${this.base}/api/user/create/${tid}`;
    }

    apiUpdateProfile(tid) {
        return `${this.base}/api/user/${tid}/update`;
    }

    apiPersonGetEssentialData(tid) {
        return `${this.base}/api/person/${tid}/data/essential`;
    }

    apiPersonGetDataForPeoplePage() {
        return `${this.base}/api/person/all/dataForPeoplePage`;
    }

    apiPersonCreate() {
        return `${this.base}/api/person/create`;
    }

    apiEntityGetSchema(entityType) {
        return `${this.base}/api/entity/${entityType}/schema`;
    }

    apiEntityTypeGetEntities(entityType) {
        return `${this.base}/api/entity/${entityType}/entities`
    }

    apiUserGetCollationTableInfo(id) {
        return this.base + '/api/user/' + id + '/collationTables';
    }
    apiUserGetMultiChunkEditionInfo(tid) {
        return `${this.base}/api/user/${tid}/multiChunkEditions`
    }

    apiBulkPageSettings() {
        return this.base + '/api/page/bulkupdate';
    }
    apiAddPages(docId) {
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

    apiConvertCollationTable(tableId) {
        return `${this.base}/api/collation-table/convert/${tableId}`;
    }

    apiEntityGetData(tid) {
        return `${this.base}/api/entity/${tid}/data`
    }

    apiEntityGetPredicateDefinitionsForType(type) {
        return `${this.base}/api/entity/${type}/predicateDefinitions`
    }

    apiEntityGetStatementQualificationObjects(withData = true) {
        return `${this.base}/api/entity/statementQualificationObjects${withData ? '/data' : ''}`;
    }

    apiEntityStatementsEdit() {
        return `${this.base}/api/entity/statements/edit`
    }

    siteAdminEntity(tid) {
        return `${this.base}/entity/${tid}/admin`;
    }

    siteDevMetadataEditor(tid) {
        return `${this.base}/dev/metadata-editor/${tid}`;
    }

    apiGetCollationTable(tableId, compactEncodedTimeString = '') {
        if (compactEncodedTimeString !== '') {
            return `${this.base}/api/collation-table/get/${tableId}/${compactEncodedTimeString}`
        }
        return `${this.base}/api/collation-table/get/${tableId}`
    }

    apiGetActiveEditionInfo() {
        return `${this.base}/api/collation-table/info/edition/active`
    }

    apiGetMultiChunkEdition(editionId, timeStamp = '') {
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

    apiEditionSourcesGet(tid) {
        return `${this.base}/api/edition/source/get/${tid}`;
    }

    apiWitnessToEdition(witnessId) {
        return `${this.base}/api/witness/${witnessId}/to/edition`;
    }

    apiWorkGetInfoOld(workId) {
        return `${this.base}/api/work/${workId}/old-info`;
    }

    apiWorkGetData(workId) {
        return `${this.base}/api/work/${workId}/data`;
    }

    apiWorksGetAuthors() {
        return `${this.base}/api/works/authors`;
    }

    apiWorkGetChunksWithTranscription(workId) {
        return `${this.base}/api/work/${workId}/chunksWithTranscription`;
    }

    apiCollationTableGetActiveTablesForWork(workId) {
        return`${this.base}/api/collation-table/active/work/${workId}`
    }

    apiPersonGetWorks(personTid) {
        return `${this.base}/api/person/${personTid}/works`;
    }

    /**
     *
     * @returns {string}
     * @deprecated
     */
    apiDocumentNew_deprecated() {
        return `${this.base}/api/doc/new`
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
    apiDeletePreset(id) {
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
    apiWitnessGet(witnessId, output = 'full') {
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

    viafPage(viafId) {
        return `https://viaf.org/viaf/${viafId}`;
    }

    wikiDataPage(wikiDataId) {
        return `https://www.wikidata.org/wiki/${wikiDataId}`;
    }

    orcidPage(orcidId) {
        return `https://orcid.org/${orcidId}`;
    }

    gndExplorePage(gndId) {
        return `https://explore.gnd.network/gnd/${gndId}`;
    }

    /**
     * Returns the logo associated with an entity id.
     *
     * Normally the entity is a predicate, for example, an external ID
     * @param {number}entityId
     * @return {string}
     */
    entityLogoUrl(entityId) {
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
     * @param {number|string}object
     * @return {string}
     */
    entityExternalUrl(predicateId, object) {
        switch(predicateId) {
            case Entity.pOrcid: return this.orcidPage(object);
            case Entity.pViafId:  return this.viafPage(object);
            case Entity.pGNDId:  return this.gndExplorePage(object);
            case Entity.pWikiDataId: return this.wikiDataPage(object);
            case Entity.pUrl: return object;
        }
        return ''
    }



}
