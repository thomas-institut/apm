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
 * Class to manage hooks and plugin calls.
 * Normally there should be only one defined per application
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class HookManager {

    /**
     *
     * @var array 
     */
    private $hooks;
    
    public function __construct() {
        $this->hooks = [];
    }
    public function attachToHook($hookName, $callable) 
    {
        if (!is_callable($callable)) {
            return false;
        }
        $this->defineHook($hookName);
        $this->hooks[$hookName][] = $callable;
        return true;
    }
    
    public function callHookedMethods($hookName, $param, $cascade = true) 
    {
        $this->defineHook($hookName);
        foreach($this->hooks[$hookName] as $callback) {
            if ($cascade)  {
                $param = call_user_func($callback, $param);
                continue;
            }
            call_user_func($callback, $param);
        }
        return $param;
    }
    
   
    public function getDefinedHooks()
    {
        return array_keys($this->hooks);
    }
    
    private function defineHook($hookName) 
    {
        if (!isset($this->hooks[$hookName])) {
            $this->hooks[$hookName] = [];
        }
    }
}
