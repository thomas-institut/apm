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

namespace APM\Plugin;

/**
 * Base class for plugins
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class Plugin {
    
    /**
     *
     * @var AverroesProject\Plugin\HookManager $hm
     */
    protected $systemManager;
    
    public function __construct($sm) {
        $this->systemManager = $sm;
    }
    abstract public function activate();
    abstract public function deactivate();
    abstract public function init();
    abstract public function getMetadata();
}
