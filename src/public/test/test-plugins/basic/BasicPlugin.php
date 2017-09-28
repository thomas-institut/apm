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
