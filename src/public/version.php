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
$config[ApmConfigParameter::VERSION] = '0.37.6 (2021-Jan-25)';


$config[ApmConfigParameter::COPYRIGHT_NOTICE] = <<<EOD
        2016-20, 
        <a href="http://www.thomasinstitut.uni-koeln.de/">
            Thomas-Institut</a>, 
        <a href="http://www.uni-koeln.de/">
            Universität zu Köln
        </a>
EOD;

