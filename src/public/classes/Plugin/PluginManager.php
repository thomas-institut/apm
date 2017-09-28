<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\Plugin;

use AverroesProject\Data\SettingsManager;
use AverroesProject\Plugin\HookManager;
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
    
    /**
     *
     * @var HookManager $hm
     */
    public $hm;
    
    /**
     *
     * @var Plugin[] $pluginObjects
     */
    public $pluginObjects;


    const PM_ERROR_NO_ERROR = 0;
    const PM_ERROR_BAD_SETTING = 1;
    const PM_ERROR_SM_ERROR = 2;
    const PM_ERROR_INVALID_DIR = 3;
    const PM_ERROR_CANNOT_LOAD_PLUGIN = 4;
    
    
    const PM_ACTIVE_PLUGINS_SETTING = 'plugins-active';
    
   
    public function __construct(SettingsManager $sm, HookManager $hm, $dirs = []) {
        $this->sm = $sm;
        $this->hm = $hm;
        $this->resetErrorStatus();
        $this->pluginDirs = [];
        $this->pluginObjects = [];
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
            return false; //@codeCoverageIgnore 
        }
        $this->resetErrorStatus();
        
        foreach($activePlugins as $pluginInfo) {
            // Check if there's already an initialized plugin object 
            $objectAlreadyThere = false;
            foreach($this->pluginObjects as $pObj) {
                if (is_a($pObj, $pluginInfo['class'])) {
                    $objectAlreadyThere = true;
                    break;
                }
            }
            if ($objectAlreadyThere) {
                continue;
            }
            $dirLoaded = true;
            if (!$this->loadPluginDir($pluginInfo['dir'], $pluginInfo['class'])) {
                // bad plugin, deactivate
                $this->deactivatePlugin($pluginInfo['dir'], $pluginInfo['class']);
                $this->errorDetails .= "\n" . $pluginInfo['dir'] . ", " . $pluginInfo['class'];
                $this->error = self::PM_ERROR_CANNOT_LOAD_PLUGIN;
                $dirLoaded = false;
            }
            if ($dirLoaded) {
                $pObject = new $pluginInfo['class']($this->hm);
                $this->pluginObjects[] = $pObject;
                $pObject->init();
            }
        }
        if ($this->error !== self::PM_ERROR_NO_ERROR) {
            return false;
        }
        return true;
    }
   
    
    public function storeActivePluginArray($apArray) 
    {
        return $this->sm->setSetting(self::PM_ACTIVE_PLUGINS_SETTING, json_encode($apArray))===true; 
    }
    public function getActivePluginArray()
    {
        $this->resetErrorStatus();
        $activePluginsSetting =  $this->sm->getSetting(self::PM_ACTIVE_PLUGINS_SETTING);
        if ($activePluginsSetting === false) {
            // No setting, create new
            if ($this->storeActivePluginArray([])) {
                return [];
            }
            // For testing, assume settings error work the way they should.
            // So, ignore this branch for coverage analysis
            // @codeCoverageIgnoreStart
            $this->error = self::PM_ERROR_SM_ERROR;
            return false;
            // @codeCoverageIgnoreEnd
        }
        $activePlugins = json_decode($activePluginsSetting, true);
        if ($activePlugins === NULL) {
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
        $activePlugins = $this->getActivePluginArray();
        if ($activePlugins === false) {
            return false; //@codeCoverageIgnore 
        }
        foreach($activePlugins as $activeP) {
            if ($activeP['dir']===$dir || $activeP['class']===$class) {
                // Plugin is already active
                return true;
            }
        }
        
        if ($this->loadPluginDir($dir, $class) === false) {
            return false;
        }
        $pObject = new $class($this->hm);
        $this->pluginObjects[] = $pObject;
        if ($pObject->activate() === false){
            return false; //@codeCoverageIgnore 
        }
        $pObject->init();
            
        $activePlugins[] = [ 'dir' => $dir, 'class' => $class];
        return $this->storeActivePluginArray($activePlugins);
    }
    
    public function deactivatePlugin($dir, $class)
    {
        $activePlugins = $this->getActivePluginArray();
        if ($activePlugins === false) {
            return false;  //@codeCoverageIgnore 
        }
        $newActivePlugins = [];
        foreach($activePlugins as $activeP) {
            if ($activeP['dir']!==$dir && $activeP['class']!==$class) {
                $newActivePlugins[] = $activeP;
            }
        }
        if (class_exists($class, false)) {
            foreach($this->pluginObjects as $pObj) {
                if (is_a($pObj, $class)){
                    $pObj->deactivate();
                }
            }
        }
        return $this->storeActivePluginArray($newActivePlugins);
    }
    
    private function isDirValid($dir) 
    {
        return is_dir($dir);
    }
    
    public function loadPluginDir($dir, $class = '') 
    {
        $files = glob($dir . "/*.php");
        foreach ($files as $file) {
            if ((include_once $file) === false) {
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