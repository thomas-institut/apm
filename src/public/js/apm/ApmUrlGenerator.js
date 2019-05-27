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
  
  constructor (baseUrl) {
    this.base = baseUrl
  }

  apiQuickCollation() {
    return this.base + '/api/public/collation/quick'
  }
  
  apiAutomaticCollation() {
    return this.base + '/api/collation/auto'
  }
  
  apiGetPresets() {
    return this.base + '/api/presets/get'
  }
  
  apiPostPresets() {
    return this.base + '/api/presets/post'
  }
  
  apiDeletePreset(id) {
    return this.base + '/api/presets/delete/' + id
  }
  
  apiGetAutomaticCollationPresets() {
    return this.base + '/api/presets/act/get'
  }
  
  siteCollationTable(work, chunkno, lang, ids=[]) {
    let extra = ''
    if (ids.length > 0) {
      extra += '/'
      extra += ids.join('/')
    }
    return this.base +  '/collation/auto/' + work + '/' + chunkno + '/' + lang + extra
  }
  
  siteCollationTableCustom(work, chunkno, lang) {
    return this.base + '/collation/auto/' + work + '/' + chunkno + '/' + lang + '/custom'
  }
  
  siteCollationTablePreset(work, chunkno, presetId) {
    return this.base + '/collation/auto/' + work + '/' + chunkno + '/preset/' +  presetId
  }
  
  sitePageView(docId, pageNumber) {
    return this.base + '/doc/' + docId + '/page/' + pageNumber + 'view'
  }
  
  siteWitness(work, chunkno, type, witnessId, output) {
    return this.base + '/chunk/' + work + '/' + chunkno + '/witness/' + type + '/' + witnessId + '/' + output
  }

}


