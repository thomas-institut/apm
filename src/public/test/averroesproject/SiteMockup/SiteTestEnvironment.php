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

namespace AverroesProject;

require_once 'DatabaseTestEnvironment.php';
require_once 'SlimTwigExtensionMockup.php';
require_once 'SlimRouterMockup.php';

require_once '../test/testdbconfig.php';

/**
 * Description of SiteTestEnvironment
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SiteTestEnvironment extends DatabaseTestEnvironment {
    
    public static function getContainer($logger) {
        global $config;
        $container = parent::getContainer($logger);

        $container['router'] = new \SlimRouterMockup();
        
        $view = new \Slim\Views\Twig('../templates', [
            'cache' => false
        ]);
        // Instantiate and add Slim specific extension
        $basePath = rtrim(str_ireplace('index.php', '', 
                $container['request']->getUri()->getBasePath()), '/');
        $view->addExtension(new \SlimTwigExtensionMockup(
                $container['router'], $basePath));

        $container['view'] = $view;
        $container['settings'] = $config;
        
        return $container;
    }

}
