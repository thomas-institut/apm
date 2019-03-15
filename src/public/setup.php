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
 * System files include this file instead of config.php directly
 *  
 */

require_once 'config.php';

// Generate langCodes
$config['langCodes'] = [];
foreach ($config['languages'] as $lang) {
    $config['langCodes'][] = $lang['code'];
}

// Generate table names 
$prefix = 'ap_';

$config['tables'] = [];
$config['tables']['settings']   = $prefix . 'settings';
$config['tables']['ednotes']    = $prefix . 'ednotes';
$config['tables']['elements']   = $prefix . 'elements';
$config['tables']['items']      = $prefix . 'items';
$config['tables']['users']      = $prefix . 'users';
$config['tables']['tokens']     = $prefix . 'tokens';
$config['tables']['relations']  = $prefix . 'relations';
$config['tables']['docs']       = $prefix . 'docs';
$config['tables']['people']     = $prefix . 'people';
$config['tables']['pages']      = $prefix . 'pages';
$config['tables']['types_page'] = $prefix . 'types_page';
$config['tables']['works']      = $prefix . 'works';
$config['tables']['presets']    = $prefix . 'presets';