<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\Plugin;

use AverroesProject\Data\SettingsManager;
/**
 * Description of PluginManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PluginManager {
    
    /**
     *
     * @var string[]
     */
    public $pluginDirs;
    
    /*
     * @var SettingsManager $sm
     */
    public $sm;
    
    /**
     *
     * @var int $error
     */
    public $error;
    
    /**
     *
     * @var string $errorDetails
     */
    public $errorDetails;
    
    const PM_ERROR_NO_ERROR = 0;
    const PM_ERROR_BAD_SETTING = 1;
    const PM_ERROR_SM_ERROR = 2;
    const PM_ERROR_INVALID_DIR = 3;
    const PM_ERROR_CANNOT_LOAD_PLUGIN = 4;
    
    
    const PM_ACTIVE_PLUGINS_SETTING = 'plugins-active';
    
   
    public function __construct(SettingsManager $sm, $dirs = []) {
        $this->sm = $sm;
        $this->resetErrorStatus();
        $this->pluginDirs = [];
        foreach($dirs as $dir) {
            $this->addPluginDir($dir);
        }
    }
    
    private function resetErrorStatus()
    {
        $this->error = self::PM_ERROR_NO_ERROR;
        $this->errorDetails = '';
    }
        
    public function addPluginDir($dir) {
        $this->resetErrorStatus();
        if ($this->isDirValid($dir)) {
            $this->pluginDirs[] = $dir;
            return true;
        }
        $this->error = self::PM_ERROR_INVALID_DIR;
        return false;
    }
    
    public function loadActivePlugins()
    {
        $activePlugins = $this->getActivePluginArray();
        if ($activePlugins === false) {
            return false;
        }
        $this->resetErrorStatus();
        
        
        foreach($activePlugins as $pluginInfo) {
            if (!$this->loadPluginDir($pluginInfo['dir'], $pluginInfo['class'])) {
                // bad plugin, deactivate
                $this->deactivatePlugin($pluginInfo['dir'], $pluginInfo['class']);
                $this->errorDetails .= "\n" . $pluginInfo['dir'] . ", " . $pluginInfo['class'];
                $this->error = self::PM_ERROR_CANNOT_LOAD_PLUGIN;
            }
        }
        if ($this->error !== self::PM_ERROR_NO_ERROR) {
            return false;
        }
        return true;
    }
   
    public function getActivePluginArray()
    {
        $this->resetErrorStatus();
        $activePluginsSetting =  $this->sm->getSetting(self::PM_ACTIVE_PLUGINS_SETTING);
        if ($activePluginsSetting === false) {
            // No setting, create new
            if ($this->sm->setSetting(self::PM_ACTIVE_PLUGINS_SETTING, serialize([]))) {
                return [];
            }
            $this->error = self::PM_ERROR_SM_ERROR;
            return false;
        }
        $activePlugins = unserialize($activePluginsSetting);
        if ($activePlugins === false) {
            // this means the setting is not a valid serialization
            $this->error = self::PM_ERROR_BAD_SETTING;
            return false;
        }
        
        if (!is_array($activePlugins)) {
            $this->error = self::PM_ERROR_BAD_SETTING;
            return false;
        }
        
        foreach($activePlugins as $pluginInfo) {
            if (!isset($pluginInfo['dir']) || !isset($pluginInfo['class'])) {
                $this->error = self::PM_ERROR_BAD_SETTING;
                return false;
            }
        }
        return $activePlugins;
    }
    
    public function activatePlugin($dir, $class)
    {
        return true;
    }
    
    public function deactivatePlugin($dir, $class)
    {
        return true;
    }
    private function isDirValid($dir) 
    {
        return is_dir($dir);
    }
    
    public function loadPluginDir($dir, $class = '') 
    {
        $files = glob($dir . "/*.php");
        foreach ($files as $file) {
            if ((include $file) === false) {
                return false;
            }
        }
        if ($class === '') {
            return true;
        }
        if (!class_exists($class, false)) {
            return false;
        }
        return true;
    }
    
    public function getPluginClasses()
    {
        $classes = get_declared_classes();
        $pluginClasses = [];
        foreach($classes as $class) {
            if (get_parent_class($class) === 'AverroesProject\Plugin\Plugin') {
                $pluginClasses[] = $class;
            }
        }
        return $pluginClasses;
    }
    
   
}
