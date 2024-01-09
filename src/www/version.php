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

use APM\System\ApmConfigParameter;

global $config;



// JS App data ID
$config[ApmConfigParameter::JS_APP_CACHE_DATA_ID] = hash('md5', '2024-01-09 12:44:21');


$config[ApmConfigParameter::APP_NAME] = 'APM';
// Version 0.42.10, named after Oded, who discovered the first reproducible bug after EditionComposer's bug detector
// was implemented
// Version 0.42.11 still named after Oded, since he also found the bug that caused the update!
$config[ApmConfigParameter::VERSION] = '0.62.3 (2023-Dec-21)';


$config[ApmConfigParameter::COPYRIGHT_NOTICE] = <<<EOD
        2016-24, 
        <a href="https://www.thomasinstitut.uni-koeln.de/">
            Thomas-Institut</a>, 
        <a href="https://www.uni-koeln.de/">
            Universität zu Köln
        </a>
EOD;

