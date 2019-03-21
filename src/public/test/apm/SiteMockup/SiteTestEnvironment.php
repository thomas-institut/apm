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

namespace APM;

require_once 'DatabaseTestEnvironment.php';
require_once 'SlimTwigExtensionMockup.php';
require_once 'SlimRouterMockup.php';

/**
 * Description of SiteTestEnvironment
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SiteTestEnvironment extends DatabaseTestEnvironment {
    
    public function getContainer() {
        $container = parent::getContainer();

        $container['router'] = new SlimRouterMockup();
        
        $view = new \Slim\Views\Twig('../templates', [
            'cache' => false
        ]);
        // Instantiate and add Slim specific extension
        $basePath = rtrim(str_ireplace('index.php', '', 
                $container['request']->getUri()->getBasePath()), '/');
        $view->addExtension(new SlimTwigExtensionMockup(
                $container['router'], $basePath));

        $container['view'] = $view;
        
        return $container;
    }

}
