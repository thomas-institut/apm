<?php


class BasicPlugin extends AverroesProject\Plugin\Plugin 
{
    public $myVar;
    
    const BP_HOOK_NAME = 'basicplugin-hook';
    
    public function __construct($hm) {
        parent::__construct($hm);
        $this->myVar = -1000;
    }
 
    public function someFunction($p) 
    {
        $this->myVar+=$p;
    }
    public function init() {

        $this->myVar = 0;
        $this->hm->attachToHook(self::BP_HOOK_NAME, array($this, 'someFunction'));
    }
    
    public function activate()
    {
        $this->myVar = -10;
    }
    
    public function deactivate() {
        $this->myVar = -1000;
    }
    
    public function getMetadata() {
        return [ 
            'name' => 'Basic', 
            'author' => 'Rafael Najera', 
            'version' => '1.0'
        ];
    }
}
