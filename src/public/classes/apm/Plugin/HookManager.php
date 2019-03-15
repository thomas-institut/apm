<?php

/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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
