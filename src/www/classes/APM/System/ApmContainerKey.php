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

/**
 * Constants for Container keys in APM
 *
 * @package APM\System
 */
class ApmContainerKey
{


    const SYSTEM_MANAGER = 'systemManager';
    const USER_ID = 'userId';
    const USER_INFO = 'userInfo';
    const API_USER_TID = 'apiUserTid';



    // Not used in APM
    //const CONFIG = 'config';
    //const LOGGER = 'logger';
    //const VIEW = 'view';
    //const ROUTER = 'router';
    //const DATA_MANAGER = 'dataManager';
    const IS_PROXIED = 'isProxied';

}
