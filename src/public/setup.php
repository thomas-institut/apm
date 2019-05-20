<?php

/* 
 *  Copyright (C) 2018 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */


/**
 * 
 * Performs common, required pre-processing of the configuration given in 
 * config.php
 * 
 *  
 */

require_once 'config.php';

// Generate langCodes
$config['langCodes'] = [];
foreach ($config['languages'] as $lang) {
    $config['langCodes'][] = $lang['code'];
}

$config['db_table_prefix'] = 'ap_';

// Collatex jar file
$config['collatex_jar_file'] = 'collatex/bin/collatex-tools-1.7.1.jar';

// Slim parameters
$config['addContentLengthHeader'] = false;

$config['plugin_dir'] = 'plugins';

$config['log_appname'] = 'APM';