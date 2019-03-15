<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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


namespace APM\System;


/**
 * Integration class for putting together all the elements necessary
 * to build and operate an APM system. 
 * 
 * Having this as an abstract class makes it easy to create alternative data
 * storage schemes for testing and migration.
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class SystemManager {
    
    
    /**
     * Checks the system to see if the different components
     * are up to date and functional.  
     */
    abstract public function checkSystemSetup();
    
    
    /**
     * Builds all the system components 
     */
    abstract public function setUpSystem();
    
    /**
     * Get methods for the different components
     */
    abstract public function getPresetsManager();
    abstract public function getLogger();
    abstract public function getHookManager();
    abstract public function getSettingsManager();
    
    
}
