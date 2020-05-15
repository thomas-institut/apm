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
class BasicPlugin extends APM\Plugin\Plugin 
{
    public $myVar;
    private $hm;
    
    const BP_HOOK_NAME = 'basicplugin-hook';
    
    public function __construct($systemManager) {
        parent::__construct($systemManager);
        $this->hm = $systemManager->getHookManager();
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
