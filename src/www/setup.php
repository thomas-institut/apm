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


/**
 * 
 * Performs common, required pre-processing of the configuration given in 
 * config.php
 * 
 *  
 */

use APM\System\ApmConfigParameter;


global $config;

$config[ApmConfigParameter::BASE_FULL_PATH] = __DIR__;

// Generate langCodes
$config[ApmConfigParameter::LANG_CODES] = [];
foreach ($config[ApmConfigParameter::LANGUAGES] as $lang) {
    $config[ApmConfigParameter::LANG_CODES][] = $lang['code'];
}

$config[ApmConfigParameter::TABLE_PREFIX] = 'ap_';

// Collatex jar file
$config[ApmConfigParameter::COLLATEX_JARFILE] = 'collatex/bin/collatex-tools-1.7.1.jar';

$config[ApmConfigParameter::PLUGIN_DIR] = __DIR__ . '/plugins';

$config[ApmConfigParameter::LOG_APPNAME] = 'APM';

// Twig templates

$config[ApmConfigParameter::TWIG_TEMPLATE_DIR] = 'templates';
$config[ApmConfigParameter::TWIG_USE_CACHE] = false;
