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
    constructor(baseUrl) {
        this.base = baseUrl;
    }
    apiGetNumColumns(docId, pageNumber) {
        return this.base + '/api/' + docId + '/' + pageNumber + '/numcolumns';
    }
    apiGetColumnData(docId, pageNumber, col) {
        return this.base + '/api/' + docId + '/' + pageNumber + '/' + col + '/elements';
    }
    apiGetColumnDataWithVersion(docId, pageNumber, col, versionID) {
        return this.base + '/api/' + docId + '/' + pageNumber + '/' + col + '/elements/version/' + versionID;
    }
    apiUpdateColumnData(docId, pageNumber, col) {
        return this.apiGetColumnData(docId, pageNumber, col) + '/update';
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
    apiCreateUser() {
        return this.base + '/api/user/new';
    }
    apiUpdateProfile(id) {
        return this.base + '/api/user/' + id + '/update';
    }
    apiUserGetInfo(id) {
        return this.base + '/api/user/' + id + '/info';
    }
    apiUserPasswordChange(id) {
        return this.base + '/api/user/' + id + '/changepassword';
    }
    apiUserMakeRoot(id) {
        return this.base + '/api/user/' + id + '/makeroot';
    }
    apiBulkPageSettings() {
        return this.base + '/api/page/bulkupdate';
    }
    apiAddPages(docId) {
        return this.base + '/api/doc/' + docId + '/addpages';
    }
    apiQuickCollation() {
        return this.base + '/api/public/collation/quick';
    }
    apiConvertSvg() {
        return this.base + '/api/convert/svg2pdf';
    }
    apiConvertCollationTable(tableId) {
        return `${this.base}/api/collation/convert/${tableId}`;
    }
    siteCollationTable(work, chunkno, lang, ids = []) {
        let extra = '';
        if (ids.length > 0) {
            extra += '/';
            extra += ids.join('/');
        }
        return this.base + '/collation/auto/' + work + '/' + chunkno + '/' + lang + extra;
    }
    siteEditCollationTable(tableId) {
        return this.base + '/collation/edit/' + tableId;
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
    apiWitnessGet(witnessId, output = 'full') {
        return this.base + '/api/witness/get/' + witnessId + '/' + output;
    }
    apiWitnessCheckUpdates() {
        return this.base + '/api/witness/check/updates';
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
    sitePageViewRealPage(docId, pageNumber) {
        return this.base + '/doc/' + docId + '/realpage/' + pageNumber + '/view';
    }
    siteChunkPage(work, chunk) {
        return this.base + '/chunk/' + work + '/' + chunk;
    }
    siteUserProfile(userName) {
        return this.base + '/user/' + userName;
    }
    siteDocPage(docId) {
        return this.base + '/doc/' + docId + '/details';
    }
}
