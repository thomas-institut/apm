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
class ApmUrlGenerator {

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
        return this.base + '/collation/auto/' + work + '/' + chunkno + '/' + lang + '/custom';
    }
    siteCollationTablePreset(work, chunkno, presetId) {
        return this.base + '/collation/auto/' + work + '/' + chunkno + '/preset/' + presetId;
    }
    sitePageView(docId, pageSequence, col = 0) {
        let url = this.base + '/doc/' + docId + '/page/' + pageSequence + '/view';
        if (col > 0) {
            url += '/c/' + col;
        }
        return url;
    }
    // sitePageViewRealPage(docId, pageNumber) {
    //     return this.base + '/doc/' + docId + '/realpage/' + pageNumber + '/view'
    // }
    siteChunkPage(work, chunk) {
        return `${this.base}/work/${work}/chunk/${chunk}`
    }

/*    siteUserProfile(userName) {
        return this.base + '/user/' + userName
    }*/

    siteWorks() {
        return `${this.base}/works`;
    }

    siteWorkPage(workId) {
        return `${this.base}/work/${workId}`;
    }

    siteDocPage(docId) {
        return this.base + '/doc/' + docId + '/details'
    }

    siteDocEdit(docId) {
        return `${this.base}/doc/${docId}/edit`
    }
    siteDocDefinePages(docId) {
        return `${this.base}/doc/${docId}/definepages`
    }

    siteDocs() {
        return this.base + '/documents'
    }

    siteDocNewDoc() {
        return `${this.base}/doc/new`;
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

    sitePerson(id) {
        return this.base + '/person/' + id
    }

    sitePeople() {
        return this.base + '/people'
    }

    siteEditMultiChunkEdition(editionId) {
        return `${this.base}/edition/multi/edit/${editionId}`
    }

    siteMultiChunkEditionNew() {
        return `${this.base}/edition/multi/new`
    }

    siteCollationTable(work, chunkno, lang, ids = []) {
        let extra = '';
        if (ids.length > 0) {
            extra += '/';
            extra += ids.join('/');
        }
        return this.base + '/collation/auto/' + work + '/' + chunkno + '/' + lang + extra;
    }
    siteEditCollationTable(tableId, version = 0) {
        let postfix = ''
        if (version !== 0) {
            postfix = `/${version}`
        }
        return `${this.base}/collation/edit/${tableId}${postfix}`
    }

    siteEditCollationTableBeta(tableId) {
        return this.base + '/collation/edit/' + tableId + '/beta'
    }

    siteBlankThumbnail() {
        return `${this.base}/images/thumbnail-blank.png`
    }

    siteOpenSeadragonIconsPrefix() {
        return `${this.base}/node_modules/openseadragon/build/openseadragon/images/`
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

    // apiUserGetInfo(id) {
    //     return this.base + '/api/user/' + id + '/info';
    // }

    apiPersonGetEssentialData(tid) {
        return `${this.base}/api/person/${tid}/data/essential`
    }

    apiPersonGetDataForPeoplePage() {
        return `${this.base}/api/person/all/dataForPeoplePage`
    }

    apiPersonCreate() {
        return `${this.base}/api/person/create`
    }



    apiUserGetCollationTableInfo(id) {
        return this.base + '/api/user/' + id + '/collationTables';
    }
    apiUserGetMultiChunkEditionInfo(tid) {
        return `${this.base}/api/user/${tid}/multiChunkEditions`
    }

    // apiUserPasswordChange(id) {
    //     return this.base + '/api/user/' + id + '/changepassword';
    // }
    // apiUserMakeRoot(id) {
    //     return this.base + '/api/user/' + id + '/makeroot';
    // }
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
        return this.base + '/api/public/collation/quick';
    }
    // apiConvertSvg() {
    //     return this.base + '/api/convert/svg2pdf';
    // }
    //
    // apiConvertTypesetterData() {
    //     return this.base + '/api/convert/ts2pdf'
    // }

    apiTypesetRaw() {
        return this.base + '/api/typeset/raw'
    }

    apiConvertCollationTable(tableId) {
        return `${this.base}/api/collation/convert/${tableId}`;
    }

    apiEntityGetData(tid) {
        return `${this.base}/api/entity/${tid}/data`
    }

    siteEntity(tid) {
        return `${this.base}/entity/${tid}`;
    }

    apiGetCollationTable(tableId, compactEncodedTimeString = '') {
        if (compactEncodedTimeString !== '') {
            return `${this.base}/api/collation/get/${tableId}/${compactEncodedTimeString}`
        }
        return `${this.base}/api/collation/get/${tableId}`
    }

    apiGetActiveEditionInfo() {
        return `${this.base}/api/collation/info/edition/active`
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

    apiWorkGetChunksWithTranscription(workId) {
        return `${this.base}/api/work/${workId}/chunksWithTranscription`;
    }

    apiPersonGetWorks(personTid) {
        return `${this.base}/api/person/${personTid}/works`;
    }

    apiDocumentNew() {
        return `${this.base}/api/doc/new`
    }

    apiDocumentUpdate(id) {
        return `${this.base}/api/doc/${id}/update`
    }

    apiDocumentDelete(id) {
        return `${this.base}/api/doc/${id}/delete`
    }




    siteChunkEdition(tableId) {
        return this.base + '/edition/chunk/edit/' + tableId;
    }
    apiAutomaticCollation() {
        return this.base + '/api/collation/auto';
    }
    apiSaveCollation() {
        return this.base + '/api/collation/save';
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

    apiPeopleGetPerson() {
        return `${this.base}/api/person/get`
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

    apiPeopleGetAllPeople() {
        return `${this.base}/api/people/all`
    }

    images() {
        return this.base + '/images'
    }


}
