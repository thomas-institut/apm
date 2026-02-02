<?php
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

namespace APM\System;


class ApmMySqlTableName
{
    const TABLE_SETTINGS = 'settings';
    const TABLE_EDNOTES = 'ednotes';
    const TABLE_ELEMENTS = 'elements';
    const TABLE_ITEMS = 'items';
    const TABLE_USERS = 'users';
    const TABLE_TOKENS = 'tokens';
//    const TABLE_RELATIONS = 'relations';
    const TABLE_DOCS = 'docs';
    const TABLE_PEOPLE = 'people';
    const TABLE_PAGES = 'pages';
    const TABLE_PAGETYPES = 'types_page';
    const TABLE_WORKS = 'works';
    const TABLE_PRESETS = 'presets';
    const TABLE_VERSIONS_TX = 'versions_tx';
    const TABLE_SYSTEM_CACHE = 'system_cache';
    const TABLE_JOBS = 'jobs';
    const TABLE_COLLATION_TABLE = 'ctables';
    const TABLE_VERSIONS_CT = 'versions_ct';
    const TABLE_MULTI_CHUNK_EDITIONS = 'mc_editions';
    const TABLE_EDITION_SOURCES = 'edition_sources';
    const TABLE_SESSIONS_REGISTER = 'sessions_register';
    const TABLE_SESSIONS_LOG = 'sessions_log';
    const TABLE_SCOPES = 'scopes';
    const TABLE_SCOPE_USERS = 'scope_users';
    const TABLE_SCOPE_DOCUMENTS = 'scope_documents';

    // Entity system tables:

    const ES_Statements_Default = 'es_default_st';
//    const ES_Statements_Person = 'es_st_person';
//    const ES_Statements_Document = 'es_st_doc';
//    const ES_Statements_Work = 'es_st_work';

    const ES_Cache_Default = 'es_default_cache';
//    const ES_Cache_Person = 'es_cache_person';
//    const ES_Cache_Document = 'es_cache_document';
//    const ES_Cache_Work =  'es_cache_work';

    const ES_Merges = 'es_merges';
}
