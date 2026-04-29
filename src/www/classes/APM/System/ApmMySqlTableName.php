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
    const string TABLE_SETTINGS = 'settings';
    const string TABLE_EDNOTES = 'ednotes';
    const string TABLE_ELEMENTS = 'elements';
    const string TABLE_ITEMS = 'items';
    const string TABLE_USERS = 'users';
    const string TABLE_TOKENS = 'tokens';
    const string TABLE_DOCS = 'docs';
    const string TABLE_PEOPLE = 'people';
    const string TABLE_PAGES = 'pages';
    const string TABLE_PAGETYPES = 'types_page';
    const string TABLE_WORKS = 'works';
    const string TABLE_PRESETS = 'presets';
    const string TABLE_VERSIONS_TX = 'versions_tx';
    const string TABLE_SYSTEM_CACHE = 'system_cache';
    const string TABLE_JOBS = 'jobs';
    const string TABLE_COLLATION_TABLE = 'ctables';
    const string TABLE_VERSIONS_CT = 'versions_ct';
    const string TABLE_MULTI_CHUNK_EDITIONS = 'mc_editions';
    const string TABLE_EDITION_SOURCES = 'edition_sources';
    const string TABLE_SESSIONS_REGISTER = 'sessions_register';
    const string TABLE_SESSIONS_LOG = 'sessions_log';

    // Entity system tables:

    const string ES_Statements_Default = 'es_default_st';
//    const ES_Statements_Person = 'es_st_person';
//    const ES_Statements_Document = 'es_st_doc';
//    const ES_Statements_Work = 'es_st_work';

    const string ES_Cache_Default = 'es_default_cache';
//    const ES_Cache_Person = 'es_cache_person';
//    const ES_Cache_Document = 'es_cache_document';
//    const ES_Cache_Work =  'es_cache_work';

    const string ES_Merges = 'es_merges';
}