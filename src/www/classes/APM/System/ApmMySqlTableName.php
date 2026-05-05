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
    const string TABLE_COLLATION_TABLE = 'ctables';
    const string TABLE_EDNOTES = 'ednotes';
    const string TABLE_ELEMENTS = 'elements';
    const string ES_Cache_Default = 'es_default_cache';
    const string ES_Statements_Default = 'es_default_st';
    const string ES_Merges = 'es_merges';
    const string TABLE_ITEMS = 'items';
    const string TABLE_MULTI_CHUNK_EDITIONS = 'mc_editions';
    const string TABLE_PAGES = 'pages';
    const string TABLE_PRESETS = 'presets';
    const string TABLE_SETTINGS = 'settings';
    const string TABLE_SYSTEM_CACHE = 'system_cache';
    const string TABLE_TOKENS = 'tokens';
    const string TABLE_USERS = 'users';
    const string TABLE_VERSIONS_CT = 'versions_ct';
    const string TABLE_VERSIONS_TX = 'versions_tx';
    const string TABLE_WORKS = 'works';
}