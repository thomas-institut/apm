<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\Plugin;

/**
 * Class to manage hooks and plugin calls.
 * Normally there should be only one define per application
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
