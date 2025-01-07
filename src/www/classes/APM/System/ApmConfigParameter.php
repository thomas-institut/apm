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
    const LOG_INCLUDE_DEBUG_INFO = 'log_include_debug_info';
    const LOG_APP_NAME = 'log_app_name';
    const LOG_IN_PHP_ERROR_HANDLER = 'log_in_php_error_handler';
    const DB = 'db';
    const DB_TABLE_PREFIX  = 'db_table_prefix';
    const COLLATION_ENGINE = 'collation_engine';
    /**
     * @deprecated
     */
    const COLLATEX_JAR_FILE = 'collatex_jar_file';
    /**
     * @deprecated
     */
    const COLLATEX_TEMP_DIR = 'collatex_temp_dir';
    /**
     * @deprecated
     */
    const JAVA_EXECUTABLE = 'java_executable';

    const COLLATEX_HTTP_HOST = 'collatex_http_host';
    const COLLATEX_HTTP_PORT = 'collatex_http_port';
    const PYTHON_VENV = 'python_env';

    const VERSION = 'version';
    const APP_NAME = 'app_name';
    const COPYRIGHT_NOTICE = 'copyright_notice';
    const SUB_DIR = 'sub_dir';
    const BASE_FULL_PATH = 'base_full_path';
    const LANGUAGES = 'languages';
    const LANG_CODES = 'lang_codes';

    const SITE_SHOW_LANGUAGE_SELECTOR = 'site_show_language_selector';

    const TWIG_TEMPLATE_DIR = 'twig_template_dir';
    const TWIG_USE_CACHE = 'twig_use_cache';

    const PDF_RENDERER = 'pdf_renderer';
    const PDF_RENDERER_TEMP_DIR = 'pdf_renderer_temp_dir';

    const TYPESETTER = 'typesetter';

    const ERROR = 'error';
    const ERROR_MESSAGES = 'error_messages';
    const WARNINGS = 'warnings';

    const CONFIG_FILE_PATH = 'config_file_path';

    const OPENSEARCH_HOSTS = 'opensearch_hosts';
    const OPENSEARCH_USER = 'opensearch_user';
    const OPENSEARCH_PASSWORD = 'opensearch_password';

    const AUTHORIZED_COMMAND_LINE_USERS = 'authorized_command_line_users';

    const APM_DAEMON_PID_FILE = 'apm_daemon_pid_file';

    const BILDERBERG_URL = 'bilderberg_url';

    const JS_APP_CACHE_DATA_ID = 'js_app_cache_data_id';


    const DARE_API_BASE_URL = 'dare_api_base_url';

    const UNI_KOELN_URL = 'uni_koeln_url';
    const THOMAS_INSTITUT_URL = 'thomas_institut_url';

    const WS_SERVER_URL = 'ws_server_url';
}