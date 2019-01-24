/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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
  
  siteCollationTable(work, chunkno, lang, ids=[]) {
    let extra = ''
    if (ids.length > 0) {
      extra += '/'
      extra += ids.join('/')
    }
    return this.base +  '/collation/auto/' + work + '/' + chunkno + '/' + lang + extra
  }
  
  
  sitePageView(docId, pageNumber) {
    return this.base + '/doc/' + docId + '/page/' + pageNumber + 'view'
  }

}


