<?php
/*
 *  Copyright (C) 2019-2024 Universität zu Köln
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


/**
 * 
 * Setups the configuration array with sensible defaults
 *
 */

use APM\System\ApmConfigParameter as ConfigParam;


global $config;

// DEFAULTS
$config[ConfigParam::APP_NAME] = 'APM';
$config[ConfigParam::LOG_APP_NAME] = 'APM';
$config[ConfigParam::BASE_FULL_PATH] = __DIR__;
$config[ConfigParam::DB_TABLE_PREFIX] = 'ap_';
$config[ConfigParam::LANGUAGES] = [
    [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
    [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
    [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3],
    [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3]
];
$config[ConfigParam::TWIG_TEMPLATE_DIR] = 'templates';
$config[ConfigParam::TWIG_USE_CACHE] = false;
$config[ConfigParam::PDF_RENDERER] = '../python/pdf-renderer.py';
$config[ConfigParam::TYPESETTER] = 'node ../node/typesetStdinJson.mjs';
$config[ConfigParam::SITE_SHOW_LANGUAGE_SELECTOR] = false;

$config[ConfigParam::COLLATION_ENGINE] = 'Collatex';
$config[ConfigParam::COLLATEX_JAR_FILE] = 'collatex/bin/collatex-tools-1.7.1.jar';
$config[ConfigParam::COLLATEX_TEMP_DIR] = '/tmp';
$config[ConfigParam::JAVA_EXECUTABLE] = '/usr/bin/java';
$config[ConfigParam::LOG_INCLUDE_DEBUG_INFO] = false;
$config[ConfigParam::LOG_IN_PHP_ERROR_HANDLER] = true;
$config[ConfigParam::TWIG_TEMPLATE_DIR] = 'templates';

$config[ConfigParam::DARE_API_BASE_URL] = 'https://dare.uni-koeln.de/app/api/db/';
$config[ConfigParam::BILDERBERG_URL] = 'https://bilderberg.uni-koeln.de';
$config[ConfigParam::UNI_KOELN_URL] = "https://www.uni-koeln.de/";
$config[ConfigParam::THOMAS_INSTITUT_URL]  = "https://www.thomasinstitut.uni-koeln.de/";

// Generate langCodes
$config[ConfigParam::LANG_CODES] = [];

foreach ($config[ConfigParam::LANGUAGES] as $lang) {
    $config[ConfigParam::LANG_CODES][] = $lang['code'];
}
