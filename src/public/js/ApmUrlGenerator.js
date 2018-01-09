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


  apiGetNumColumns(docId, pageNumber) {
    return this.base + '/api/' + docId + '/' + pageNumber + '/numcolumns' 
  }
  
  apiGetColumnData(docId, pageNumber, col) {
    return this.base + '/api/' + docId + '/' + pageNumber + '/' + col + '/elements'
  }
  
  apiUpdateColumnData(docId, pageNumber, col) {
    return this.apiGetColumnData(docId, pageNumber, col) + '/update'
  }
  
  apiAddColumn(docId, pageNumber) { 
    return this.base + '/api/' + docId + '/' + pageNumber + '/newcolumn'
  }
  
  apiUpdatePageSettings(pageId) {
    return this.base + '/api/page/' + pageId + '/update'
  }
  
  openSeaDragonImagePrefix() {
    return this.base + '/node_modules/openseadragon/build/openseadragon/images/'
  }
  
  apiCreateUser () {
    return this.base + '/api/user/new'
  }

  updateProfile (id) {
    return this.base + '/api/user/' + id + '/update'
  }

  userGetInfo (id) {
    return this.base + '/api/user/' + id + '/info'
  }

  userPasswordChange (id) {
    return this.base + '/api/user/' + id + '/changepassword'
  }

  userMakeRoot (id) {
    return this.base + '/api/user/' + id + '/makeroot'
  }
  
  apiBulkPageSettings() {
    return this.base + '/api/page/bulkupdate'
  }
  
}


