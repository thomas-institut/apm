<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\Plugin;

/**
 * Description of Plugin
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class Plugin {
    
    /**
     *
     * @var AverroesProject\Plugin\HookManager $hm
     */
    protected $hm;
    
    public function __construct($hm) {
        $this->hm = $hm;
    }
    abstract public function activate();
    abstract public function deactivate();
    abstract public function init();
    abstract public function getMetadata();
}
