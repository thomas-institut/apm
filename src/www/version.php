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

require_once 'config.php';

global $config;


$config[ApmConfigParameter::APP_NAME] = 'APM';
// Version 0.42.10, named after Oded, who discovered the first reproducible bug after EditionComposer's bug detector
// was implemented
// Version 0.42.11 still named after Oded, since he also found the bug that caused the update!
$config[ApmConfigParameter::VERSION] = '0.47.3 (2022-May-18)';


$config[ApmConfigParameter::COPYRIGHT_NOTICE] = <<<EOD
        2016-22, 
        <a href="https://www.thomasinstitut.uni-koeln.de/">
            Thomas-Institut</a>, 
        <a href="https://www.uni-koeln.de/">
            Universität zu Köln
        </a>
EOD;

