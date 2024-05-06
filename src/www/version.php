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

use APM\System\ApmConfigParameter;

global $config;

$config[ApmConfigParameter::APP_NAME] = 'APM';


//
// APM Version.
//
// + Version 0.42.10, named after Oded, who discovered the first reproducible bug after EditionComposer's bug detector
//   was implemented
// + Version 0.42.11 still named after Oded, since he also found the bug that caused the update!
//
$config[ApmConfigParameter::VERSION] = '0.64.1 (2024-May-06)';

//
// Copyright Notice
//
$config[ApmConfigParameter::COPYRIGHT_NOTICE] = <<<EOD
2016-24, <a href="https://www.thomasinstitut.uni-koeln.de/">Thomas-Institut</a>,
<a href="https://www.uni-koeln.de/"> Universität zu Köln </a>
EOD;

//
// JS App Cache Data ID
//
// To be absolutely sure that this is a unique, but non-readable string, use a manually generated hash manually of the
// current date/time.
//
// On a Linux machine:
//
//    echo -n "1999-01-01 12:58:21" | openssl dgst -md5
//
// or use  https://www.md5hashgenerator.com/
//
// It is important not to use a PHP function to generate the string because we want to be able to read the actual
// string sent to the JS app(s). Otherwise it will be impossible to debug potential browser cache problems.
//

$config[ApmConfigParameter::JS_APP_CACHE_DATA_ID] = '93ba9f336a0dc3838c3024f2d75541bc'; // hash: '2024-02-29 08:30:00'
$config[ApmConfigParameter::JS_APP_CACHE_DATA_ID] = '20240325-002'; // hash: '2024-02-29 08:30:00'