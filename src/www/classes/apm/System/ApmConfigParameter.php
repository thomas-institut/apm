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
    const DEFAULT_TIMEZONE = 'default_timezone';
    const LOG_FILENAME = 'log_filename';
    const LOG_DEBUG = 'log_include_debug_info';
    const LOG_APPNAME = 'log_appname';
    const LOG_IN_PHP_ERROR_HANDLER = 'log_in_php_error_handler';
    const DB = 'db';
    const TABLE_PREFIX  = 'db_table_prefix';
    const COLLATION_ENGINE = 'collation_engine';
    const COLLATEX_JARFILE = 'collatex_jar_file';
    const COLLATEX_TMPDIR = 'collatex_temp_dir';
    const JAVA_EXECUTABLE = 'java_executable';
    const PLUGIN_DIR = 'plugin_dir';
    const PLUGINS = 'plugins';
    const VERSION = 'version';
    const APP_NAME = 'app_name';
    const COPYRIGHT_NOTICE = 'copyright_notice';
    const SUPPORT_CONTACT_NAME = 'support_contact_name';
    const SUPPORT_CONTACT_EMAIL = 'support_contact_email';
    const BASE_URL = 'baseurl';
    const SUB_DIR = 'sub_dir';
    const BASE_FULL_PATH = 'base_full_path';
    const LANGUAGES = 'languages';
    const LANG_CODES = 'langCodes';

    const TWIG_TEMPLATE_DIR = 'twigTemplateDir';
    const TWIG_USE_CACHE = 'twigUseCache';

    const INKSCAPE_EXECUTABLE = 'inkscape_executable';
    const INKSCAPE_VERSION = 'inkscape_version';
    const INKSCAPE_TEMP_DIR = 'inkscape_temp_dir';

    const ERROR = 'error';
    const ERROR_MESSAGES = 'errorMsgs';
    const WARNINGS = 'warnings';

}