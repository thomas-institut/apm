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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace AverroesProjectToApm\Site;

/**
 * Site Controller class
 *
 */
class SiteController
{
    protected $ci;
    
    //Constructor
    public function __construct( $ci)
    {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->hm = $ci->hm;
       $config = $this->ci->settings;
       $this->ci->copyrightNotice  = $config['app_name'] . " v" . 
               $config['version'] . " &bull; &copy; " . 
               $config['copyright_notice'] . " &bull; " .  
               strftime("%d %b %Y, %H:%M:%S %Z");
    }
    
}
