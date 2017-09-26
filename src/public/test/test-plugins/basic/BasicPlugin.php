<?php


class BasicPlugin extends AverroesProject\Plugin\Plugin 
{
   
    public function init() {

    }
    
    public function activate()
    {
        
    }
    
    public function deactivate() {
        
    }
    
    public function getMetadata() {
        return [ 
            'name' => 'Basic', 
            'author' => 'Rafael Najera', 
            'version' => '1.0'
        ];
    }
}
