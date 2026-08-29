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


class ApmConfigParameter
{

    const string DB = 'db';


    const string ERROR = 'error';
    const string ERROR_MESSAGES = 'error_messages';
    const string WARNINGS = 'warnings';

    const string TYPESENSE_HOST = 'typesense_host';
    const string TYPESENSE_KEY = 'typesense_key';
    const string TYPESENSE_PORT = 'typesense_port';
    const string TYPESENSE_PROTOCOL = 'typesense_protocol';
    const string TYPESENSE_PAGESIZE = 'typesense_pagesize';
}